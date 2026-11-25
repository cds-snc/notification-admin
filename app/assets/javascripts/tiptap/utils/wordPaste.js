// Variables like ((first_name)) must stay untouched so they keep parsing as variables
const escapeMarkdownText = (text) =>
  text
    .split(/(\(\([^()]*\)\))/)
    .map((part, i) => (i % 2 ? part : part.replace(/([\\*_`[\]])/g, "\\$1")))
    .join("");

const isWordListParagraph = (element) => {
  const style = element.getAttribute("style") || "";
  return /mso-list:\s*[^;]+level\d+/i.test(style);
};

const getWordListInfo = (element) => {
  const style = element.getAttribute("style") || "";
  const level = Number(style.match(/level(\d+)/i)?.[1] || 1);
  const marker = Array.from(element.querySelectorAll("[style]")).find((child) =>
    (child.getAttribute("style") || "")
      .toLowerCase()
      .includes("mso-list:ignore"),
  );
  const markerText = marker?.textContent.trim() || "";
  const ordered = /^\d+[.)]/.test(markerText);

  return {
    level,
    marker,
    ordered,
    prefix: ordered ? `${markerText.match(/^\d+/)[0]}. ` : "- ",
  };
};

const isBlockElement = (element) =>
  /^(ADDRESS|ARTICLE|ASIDE|BLOCKQUOTE|DIV|H[1-6]|LI|OL|P|PRE|SECTION|UL)$/.test(
    element.tagName,
  );

const renderInline = (node, context = {}, skipNode = null) => {
  if (node === skipNode) return "";
  if (node.nodeType === Node.TEXT_NODE) {
    return escapeMarkdownText(node.nodeValue || "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  if (/^(SCRIPT|STYLE|XML)$/.test(node.tagName)) return "";
  if (node.tagName === "BR") return "\n";

  const style = (node.getAttribute("style") || "").toLowerCase();
  const bold =
    context.bold ||
    /^(B|STRONG)$/.test(node.tagName) ||
    /font-weight:\s*(bold|[6-9]00)/.test(style);
  const italic =
    context.italic ||
    /^(I|EM)$/.test(node.tagName) ||
    /font-style:\s*italic/.test(style);
  const content = Array.from(node.childNodes)
    .map((child) => renderInline(child, { bold, italic }, skipNode))
    .join("");

  let formatted = content;
  // Word bookmarks are <a name="..."> without an href; keep only their text
  const href = node.tagName === "A" ? node.getAttribute("href") : null;
  if (href && content.trim() && !/^#/.test(href)) {
    const url = href
      .trim()
      .replace(/ /g, "%20")
      .replace(/[()]/g, encodeURIComponent);
    formatted = `[${content}](${url})`;
  }
  if (italic && !context.italic) formatted = `*${formatted}*`;
  if (bold && !context.bold) formatted = `**${formatted}**`;
  return formatted;
};

const headingLevel = (element) => {
  const tagHeading = element.tagName.match(/^H([1-6])$/);
  if (tagHeading) return Math.min(Number(tagHeading[1]), 2);

  const className = element.className?.toString() || "";
  const classHeading = className.match(/msoheading([1-2])/i);
  if (classHeading) return Number(classHeading[1]);

  const outlineLevel = (element.getAttribute("style") || "").match(
    /mso-outline-level:\s*([1-2])/i,
  );
  return outlineLevel ? Number(outlineLevel[1]) : null;
};

const renderList = (list, depth = 0) => {
  const ordered = list.tagName === "OL";
  const start = Number(list.getAttribute("start") || 1);
  const items = Array.from(list.children).filter(
    (child) => child.tagName === "LI",
  );

  return items
    .map((item, index) => {
      const marker = ordered ? `${start + index}. ` : "- ";
      const content = [];
      const nestedLists = [];

      Array.from(item.childNodes).forEach((child) => {
        if (
          child.nodeType === Node.ELEMENT_NODE &&
          /^(OL|UL)$/.test(child.tagName)
        ) {
          nestedLists.push(child);
        } else if (
          child.nodeType === Node.ELEMENT_NODE &&
          isBlockElement(child)
        ) {
          content.push(renderBlocks(child).join(" "));
        } else {
          content.push(renderInline(child));
        }
      });

      const itemContent = content.join("").trim();
      const nestedItems = nestedLists.flatMap((nested) =>
        renderList(nested, depth + (itemContent ? 1 : 0)),
      );
      if (!itemContent) return nestedItems;

      return [`${"  ".repeat(depth)}${marker}${itemContent}`, ...nestedItems];
    })
    .flat()
    .join("\n");
};

const renderBlocks = (container) => {
  const blocks = [];
  let wordList = [];
  let wordListKind = null;

  const flushWordList = () => {
    if (!wordList.length) return;
    blocks.push(wordList.join("\n"));
    wordList = [];
    wordListKind = null;
  };

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = renderInline(node).trim();
      if (text) {
        flushWordList();
        blocks.push(text);
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    if (isWordListParagraph(node)) {
      const { level, marker, prefix, ordered } = getWordListInfo(node);
      const kind = ordered ? "ordered" : "bullet";
      if (wordListKind && wordListKind !== kind) flushWordList();
      wordListKind = kind;
      const content = renderInline(node, {}, marker).trim();
      if (!content) return;
      wordList.push(
        `${"  ".repeat(Math.max(0, level - 1))}${prefix}${content}`,
      );
      return;
    }

    flushWordList();
    if (/^(OL|UL)$/.test(node.tagName)) {
      blocks.push(renderList(node));
    } else if (/^(SCRIPT|STYLE|XML)$/.test(node.tagName)) {
      return;
    } else if (node.tagName === "HR") {
      blocks.push("---");
    } else if (node.tagName === "BLOCKQUOTE") {
      blocks.push(
        renderBlocks(node)
          .map((line) => `> ${line}`)
          .join("\n"),
      );
    } else if (isBlockElement(node)) {
      const heading = headingLevel(node);
      if (heading) {
        blocks.push(`${"#".repeat(heading)} ${renderInline(node).trim()}`);
      } else if (
        node.tagName === "DIV" &&
        Array.from(node.children).some(isBlockElement)
      ) {
        blocks.push(...renderBlocks(node));
      } else {
        blocks.push(renderInline(node).trim());
      }
    } else {
      const text = renderInline(node).trim();
      if (text) blocks.push(text);
    }
  });

  flushWordList();
  return blocks.filter((block) => block !== "");
};

export const wordHtmlToMarkdown = (html) => {
  if (typeof html !== "string" || !html.trim()) return "";

  const document = new DOMParser().parseFromString(html, "text/html");
  document
    .querySelectorAll("head, meta, link, script, style, xml")
    .forEach((element) => element.remove());

  return renderBlocks(document.body).join("\n\n");
};
