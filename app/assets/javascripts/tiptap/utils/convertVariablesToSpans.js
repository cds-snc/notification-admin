// Helper to convert ((variable)) markdown into HTML spans used by the editor
export default function convertVariablesToSpans(text) {
  if (!text) return text;

  // Extract and temporarily replace markdown link destinations ](...) to
  // prevent variable conversion inside link hrefs.
  const linkPlaceholders = [];
  let processedText = text.replace(/\]\(([^)]*(?:\([^)]*\))*[^)]*)\)/g, (match) => {
    const placeholder = `__LINK_PLACEHOLDER_${linkPlaceholders.length}__`;
    linkPlaceholders.push(match);
    return placeholder;
  });

  // Now replace variables only outside link destinations
  processedText = processedText.replace(/\(\(([^)]+)\)\)/g, (_match, p1) => {
    // Escape the content to avoid injecting HTML
    const escaped = String(p1)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

    return `<span data-type="variable">${escaped}</span>`;
  });

  // Restore the link placeholders
  linkPlaceholders.forEach((link, idx) => {
    processedText = processedText.replace(
      `__LINK_PLACEHOLDER_${idx}__`,
      link,
    );
  });

  return processedText;
}
