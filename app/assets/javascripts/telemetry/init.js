import {
  BasicTracerProvider,
  BatchSpanProcessor,
} from "@opentelemetry/sdk-trace-web";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import {
  MeterProvider,
  PeriodicExportingMetricReader,
} from "@opentelemetry/sdk-metrics";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { FetchInstrumentation } from "@opentelemetry/instrumentation-fetch";
import { XMLHttpRequestInstrumentation } from "@opentelemetry/instrumentation-xml-http-request";
import { UserInteractionInstrumentation } from "@opentelemetry/instrumentation-user-interaction";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { CompositePropagator } from "@opentelemetry/core";
import { context as otelContext, propagation, trace } from "@opentelemetry/api";

const OTLP_PROXY_PATH_PATTERN = /\/otlp-proxy\/v1\/(traces|metrics)$/;

const SESSION_ID_STORAGE_KEY = "otel.session.id";

const generateSessionId = () => {
  if (typeof crypto === "undefined") {
    return null;
  }
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  if (typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // RFC 4122 v4 layout
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  return null;
};

const getOrCreateSessionId = () => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) {
      return generateSessionId();
    }
    let sessionId = window.sessionStorage.getItem(SESSION_ID_STORAGE_KEY);
    if (!sessionId) {
      sessionId = generateSessionId();
      if (sessionId) {
        window.sessionStorage.setItem(SESSION_ID_STORAGE_KEY, sessionId);
      }
    }
    return sessionId;
  } catch (_error) {
    return generateSessionId();
  }
};

// SpanProcessor that stamps session.id (and optional enduser.id) on every span as it starts,
// so spans across separate page navigations can be grouped in the backend even when they
// can't share a trace_id (full-page navigations don't propagate W3C trace context).
const createSessionAttributeSpanProcessor = (sessionId, userId) => ({
  onStart(span) {
    if (sessionId) {
      span.setAttribute("session.id", sessionId);
    }
    if (userId) {
      span.setAttribute("enduser.id", userId);
    }
  },
  onEnd() {},
  forceFlush() {
    return Promise.resolve();
  },
  shutdown() {
    return Promise.resolve();
  },
});

const buildCorsUrlMatchers = (rawUrls) => {
  if (!Array.isArray(rawUrls)) {
    return [];
  }
  const escapeForRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return rawUrls
    .filter((value) => typeof value === "string" && value.length > 0)
    .map((value) => new RegExp(`^${escapeForRegex(value)}`));
};

const toMsEpoch = (relativeTimeMs) => performance.timeOrigin + relativeTimeMs;

const createNavigationSpan = (tracer) => {
  if (
    typeof performance === "undefined" ||
    typeof performance.getEntriesByType !== "function"
  ) {
    return;
  }

  const navigationEntry = performance.getEntriesByType("navigation")[0];
  if (!navigationEntry) {
    return;
  }

  const pageLoadSpan = tracer.startSpan("browser.page_load", {
    startTime: toMsEpoch(navigationEntry.startTime),
  });

  pageLoadSpan.setAttribute(
    "browser.navigation.type",
    navigationEntry.type || "unknown",
  );
  pageLoadSpan.setAttribute(
    "browser.navigation.protocol",
    navigationEntry.nextHopProtocol || "unknown",
  );
  pageLoadSpan.setAttribute(
    "browser.navigation.redirect_count",
    navigationEntry.redirectCount || 0,
  );
  pageLoadSpan.setAttribute(
    "browser.navigation.dom_complete_ms",
    navigationEntry.domComplete || 0,
  );
  pageLoadSpan.setAttribute(
    "browser.navigation.dom_content_loaded_ms",
    navigationEntry.domContentLoadedEventEnd || 0,
  );
  pageLoadSpan.setAttribute(
    "browser.navigation.response_start_ms",
    navigationEntry.responseStart || 0,
  );
  pageLoadSpan.setAttribute(
    "browser.navigation.response_end_ms",
    navigationEntry.responseEnd || 0,
  );

  const endTime =
    navigationEntry.loadEventEnd > 0
      ? toMsEpoch(navigationEntry.loadEventEnd)
      : toMsEpoch(performance.now());
  pageLoadSpan.end(endTime);
};

const getOtlpBaseCandidates = (otlpEndpoint) => {
  const baseEndpoint = otlpEndpoint.replace(/\/$/, "");
  const candidates = [baseEndpoint];

  if (typeof window !== "undefined" && baseEndpoint.startsWith("/")) {
    candidates.push(`${window.location.origin}${baseEndpoint}`);
  }

  return candidates;
};

const isOtlpRequestUrl = (requestUrl, otlpEndpoint) => {
  if (typeof requestUrl !== "string") {
    return false;
  }

  return getOtlpBaseCandidates(otlpEndpoint).some(
    (candidate) =>
      requestUrl.startsWith(`${candidate}/v1/traces`) ||
      requestUrl.startsWith(`${candidate}/v1/metrics`),
  );
};

const installOtlpFetchLogging = (otlpEndpoint) => {
  if (typeof window === "undefined" || typeof window.fetch !== "function") {
    return;
  }

  if (window.__otelFetchLoggingInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (...args) => {
    const input = args[0];
    const requestUrl = typeof input === "string" ? input : input?.url;
    const isOtlpRequest = isOtlpRequestUrl(requestUrl, otlpEndpoint);

    if (!isOtlpRequest) {
      return originalFetch(...args);
    }

    try {
      const response = await originalFetch(...args);
      return response;
    } catch (error) {
      console.error(`[OTEL] Export request failed for ${requestUrl}:`, error);
      throw error;
    }
  };

  window.__otelFetchLoggingInstalled = true;
};

const installOtlpXhrLogging = (otlpEndpoint) => {
  if (typeof window === "undefined" || typeof XMLHttpRequest === "undefined") {
    return;
  }

  if (window.__otelXhrLoggingInstalled) {
    return;
  }

  const originalOpen = XMLHttpRequest.prototype.open;
  const originalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (...args) {
    this.__otelRequestUrl = args[1];
    return originalOpen.apply(this, args);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (isOtlpRequestUrl(this.__otelRequestUrl, otlpEndpoint)) {
      this.addEventListener("loadend", () => {
        if (this.status >= 400) {
          console.error(
            `[OTEL] Export XHR failed: ${this.status} ${this.statusText} for ${this.__otelRequestUrl}`,
          );
        }
      });
      this.addEventListener("error", () => {
        console.error(`[OTEL] Export XHR failed for ${this.__otelRequestUrl}`);
      });
      this.addEventListener("abort", () => {
        console.warn(`[OTEL] Export XHR aborted for ${this.__otelRequestUrl}`);
      });
    }

    return originalSend.apply(this, args);
  };

  window.__otelXhrLoggingInstalled = true;
};

const initTelemetry = () => {
  if (window.__otelInitialized) {
    return window.__otelInitialized;
  }
  if (!window.OTEL_CONFIG?.enabled) {
    return null;
  }

  if (window.__otelInitialized) {
    return window.otel ?? null;
  }
  window.__otelInitialized = true;

  const otlpEndpoint = window.OTEL_CONFIG.endpoint;
  const otelServiceName =
    window.OTEL_CONFIG.serviceName || "notification-admin-frontend";
  const sessionId = getOrCreateSessionId();
  const userId =
    typeof window.OTEL_CONFIG.userId === "string" && window.OTEL_CONFIG.userId
      ? window.OTEL_CONFIG.userId
      : "";
  const propagateTraceHeaderCorsUrls = buildCorsUrlMatchers(
    window.OTEL_CONFIG.propagateTraceHeaderCorsUrls,
  );

  installOtlpFetchLogging(otlpEndpoint);
  installOtlpXhrLogging(otlpEndpoint);

  // Create resource with service metadata
  const resource = Resource.default().merge(
    new Resource({
      [SEMRESATTRS_SERVICE_NAME]: otelServiceName,
      [SEMRESATTRS_SERVICE_VERSION]: "0.0.1",
      environment: import.meta.env.VITE_ENV || "development",
    }),
  );

  // Initialize Trace Provider. We register the context manager, propagator,
  // and tracer provider explicitly on the api package rather than relying on
  // tracerProvider.register(), because that helper is a no-op when another
  // OTel package has already touched api.context/api.propagation during import
  // (which happens with the @opentelemetry/instrumentation auto-loader).
  const propagator = new CompositePropagator({
    propagators: [new W3CTraceContextPropagator()],
  });
  const contextManager = new ZoneContextManager();
  contextManager.enable();

  const tracerProvider = new BasicTracerProvider({ resource });

  otelContext.setGlobalContextManager(contextManager);
  propagation.setGlobalPropagator(propagator);
  trace.setGlobalTracerProvider(tracerProvider);

  tracerProvider.addSpanProcessor(
    createSessionAttributeSpanProcessor(sessionId, userId),
  );

  const traceUrl = `${otlpEndpoint.replace(/\/$/, "")}/v1/traces`;
  const traceExporter = new OTLPTraceExporter({ url: traceUrl });
  tracerProvider.addSpanProcessor(new BatchSpanProcessor(traceExporter));

  // Initialize Metrics Provider
  const metricsUrl = `${otlpEndpoint.replace(/\/$/, "")}/v1/metrics`;
  const metricReader = new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({ url: metricsUrl }),
    intervalMillis: 60000,
  });
  const meterProvider = new MeterProvider({
    resource,
    readers: [metricReader],
  });

  // Register auto-instrumentations
  registerInstrumentations({
    instrumentations: [
      new FetchInstrumentation({
        ignoreUrls: [OTLP_PROXY_PATH_PATTERN],
        propagateTraceHeaderCorsUrls,
      }),
      new XMLHttpRequestInstrumentation({
        ignoreUrls: [OTLP_PROXY_PATH_PATTERN],
        propagateTraceHeaderCorsUrls,
      }),
      new UserInteractionInstrumentation({
        eventNames: ["click", "submit"],
      }),
    ],
    tracerProvider,
    meterProvider,
  });

  // Set global trace and meter providers
  const tracer = tracerProvider.getTracer(otelServiceName);
  const meter = meterProvider.getMeter(otelServiceName);
  window.otel = { tracerProvider, meterProvider, tracer, meter };

  createNavigationSpan(tracer);

  setTimeout(() => {
    tracerProvider
      .forceFlush()
      .catch((error) =>
        console.error("[OTEL] Trace forceFlush failed:", error),
      );
  }, 2000);

  const providers = { tracerProvider, meterProvider };
  window.__otelInitialized = providers;
  return providers;
};

// Initialize telemetry on module load if enabled
if (typeof window !== "undefined") {
  initTelemetry();
}

export default initTelemetry;
