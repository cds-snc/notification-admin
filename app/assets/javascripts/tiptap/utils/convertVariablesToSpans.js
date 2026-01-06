// Helper to convert ((variable)) markdown into HTML spans used by the editor
export default function convertVariablesToSpans(text) {
  if (!text) return text;

  // We need to avoid converting conditional blocks ((condition??content))
  // into variables. We do a small parse instead of a single regex so:
  // - conditionals are preserved intact
  // - variables can still be converted elsewhere

  let output = "";
  let cursor = 0;

  while (cursor < text.length) {
    const openIdx = text.indexOf("((", cursor);
    if (openIdx === -1) {
      output += text.slice(cursor);
      break;
    }

    output += text.slice(cursor, openIdx);

    const closeIdx = text.indexOf("))", openIdx + 2);
    if (closeIdx === -1) {
      // No closing marker; leave the rest as-is.
      output += text.slice(openIdx);
      break;
    }

    const inner = text.slice(openIdx + 2, closeIdx);

    // If this looks like a conditional, leave it untouched so ConditionalNode
    // can parse it later.
    if (inner.includes("??")) {
      output += text.slice(openIdx, closeIdx + 2);
      cursor = closeIdx + 2;
      continue;
    }

    // Escape the content to avoid injecting HTML
    const escaped = String(inner)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    output += `<span data-type="variable">${escaped}</span>`;
    cursor = closeIdx + 2;
  }

  return output;
}
