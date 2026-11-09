// Helper to convert ((variable)) markdown into HTML spans used by the editor
export default function convertVariablesToSpans(text) {
  if (!text) return text;

  // Extract and temporarily replace markdown link destinations ](...) to
  // prevent variable conversion inside link hrefs.
  const linkPlaceholders = [];
  let processedText = text;

  // Find and replace links by properly balancing parentheses.
  // The regex finds ]( and we then manually balance the parens.
  let result = "";
  let i = 0;

  while (i < processedText.length) {
    const idx = processedText.indexOf("](", i);
    if (idx === -1) {
      result += processedText.slice(i);
      break;
    }

    // Add everything up to but not including ](
    result += processedText.slice(i, idx);

    // Now find the matching closing )
    let parenDepth = 1;
    let j = idx + 2; // Start after ](

    while (j < processedText.length && parenDepth > 0) {
      if (processedText[j] === "(") parenDepth++;
      if (processedText[j] === ")") parenDepth--;
      j++;
    }

    if (parenDepth === 0) {
      // Found a complete link - save the entire ](...) match
      const linkMatch = processedText.slice(idx, j);
      const placeholder = `__LINK_PLACEHOLDER_${linkPlaceholders.length}__`;
      linkPlaceholders.push(linkMatch);
      result += placeholder;
      i = j;
    } else {
      // Unmatched parens, just add ]( and continue
      result += processedText.slice(idx, idx + 2);
      i = idx + 2;
    }
  }

  processedText = result;

  let output = "";
  let cursor = 0;
  let lastWasVariable = false; // Track if the last thing output was a variable span

  while (cursor < processedText.length) {
    const openIdx = processedText.indexOf("((", cursor);
    if (openIdx === -1) {
      output += processedText.slice(cursor);
      break;
    }

    const textBetween = processedText.slice(cursor, openIdx);
    output += textBetween;

    // If we output text between variables, we're no longer adjacent
    if (textBetween.length > 0) {
      lastWasVariable = false;
    }

    const closeIdx = processedText.indexOf("))", openIdx + 2);
    if (closeIdx === -1) {
      // No closing marker; leave the rest as-is.
      output += processedText.slice(openIdx);
      break;
    }

    const inner = processedText.slice(openIdx + 2, closeIdx);

    // If this looks like a conditional, leave it untouched so ConditionalNode
    // can parse it later.
    if (inner.includes("??")) {
      output += processedText.slice(openIdx, closeIdx + 2);
      cursor = closeIdx + 2;
      lastWasVariable = false;
      continue;
    }

    // Now replace variables only outside link destinations
    // Match only variable contents that do not contain parentheses so nested
    // parentheses are handled as surrounding text. Example: '(((var)))' ->
    // '(' + '<span>var</span>' + ')'
    if (inner.includes("(") || inner.includes(")")) {
      // Skip just the first paren and continue; the inner ones will be processed next iteration
      output += processedText[openIdx];
      cursor = openIdx + 1;
      lastWasVariable = false;
      continue;
    }

    // Escape the content to avoid injecting HTML.
    const escaped = String(inner)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

    // If last output was a variable span, insert a zero-width space separator
    // to prevent ProseMirror from merging adjacent variables
    if (lastWasVariable) {
      output += "\u200B"; // Zero-width space
    }

    output += `<span data-type="variable">${escaped}</span>`;
    cursor = closeIdx + 2;
    lastWasVariable = true;
  }

  // Restore the link placeholders.
  linkPlaceholders.forEach((link, idx) => {
    output = output.replace(`__LINK_PLACEHOLDER_${idx}__`, link);
  });

  return output;
}
