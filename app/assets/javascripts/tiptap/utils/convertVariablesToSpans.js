// Helper to convert ((variable)) markdown into HTML spans used by the editor
export default function convertVariablesToSpans(text) {
  if (!text) return text;

  // Basic replacement - captures inside parentheses lazily
  return text.replace(/\(\(([^)]+)\)\)/g, (_match, p1) => {
    // Escape the content to avoid injecting HTML
    const escaped = String(p1)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return `<span data-type="variable">${escaped}</span>`;
  });
}
