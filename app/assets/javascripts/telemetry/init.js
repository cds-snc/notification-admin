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
import { propagation, trace, context } from "@opentelemetry/api";
import { ZoneContextManager } from "@opentelemetry/context-zone";
import { W3CTraceContextPropagator } from "@opentelemetry/core";
import { CompositePropagator } from "@opentelemetry/core";

const OTLP_PROXY_PATH_PATTERN = /\/otlp-proxy\/v1\/(traces|metrics)$/;

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
  if (!window.OTEL_CONFIG?.enabled) {
    return null;
  }

  const otlpEndpoint = window.OTEL_CONFIG.endpoint;
  const otelServiceName =
    window.OTEL_CONFIG.serviceName || "notification-admin-frontend";
  installOtlpFetchLogging(otlpEndpoint);
  installOtlpXhrLogging(otlpEndpoint);

  // Create resource with service metadata
  const resource = Resource.default().merge(
    new Resource({
      [SEMRESATTRS_SERVICE_NAME]: otelServiceName,
      [SEMRESATTRS_SERVICE_VERSION]: "0.0.1",
      environment: process.env.VITE_ENV || "development",
    }),
  );

  // Initialize Trace Provider
  const tracerProvider = new BasicTracerProvider({ resource });

  // Create and set context manager globally
  const contextManager = new ZoneContextManager();
  context.setContextManager(contextManager);

  // Create and set propagator globally
  const propagator = new CompositePropagator({
    propagators: [new W3CTraceContextPropagator()],
  });
  propagation.setGlobalPropagator(propagator);

  // Set tracer provider globally
  trace.setTracerProvider(tracerProvider);

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
        propagateTraceHeaderCorsUrls: [/.*/],
      }),
      new XMLHttpRequestInstrumentation({
        ignoreUrls: [OTLP_PROXY_PATH_PATTERN],
        propagateTraceHeaderCorsUrls: [/.*/],
      }),
      new UserInteractionInstrumentation({
        eventNames: ["click", "submit"],
      }),
    ],
    tracerProvider,
    meterProvider,
  });

  // Set global trace and meter providers
  if (typeof window !== "undefined") {
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
  }

  return { tracerProvider, meterProvider };
};

// Initialize telemetry on module load if enabled
if (typeof window !== "undefined") {
  initTelemetry();
}

export default initTelemetry;
