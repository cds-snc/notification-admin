import { Table as TiptapTable } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";

const WIDTH_MARKER_PREFIX = "[[table-widths:";
const WIDTH_MARKER_REGEX = /^\[\[table-widths:\s*([^\]]+)\]\]$/i;

const MarkdownWidthTable = TiptapTable.extend({
  addStorage() {
    const parentStorage = this.parent?.() || {};
    const parentMarkdown = parentStorage.markdown || {};
    const parentParse = parentMarkdown.parse || {};

    return {
      ...parentStorage,
      markdown: {
        ...parentMarkdown,
        serialize: (state, node) => {
          const widths = [];
          const firstRow = node.firstChild;

          if (firstRow) {
            firstRow.forEach((cell) => {
              const colspan = Number(cell.attrs?.colspan) || 1;
              const colwidth = Array.isArray(cell.attrs?.colwidth)
                ? cell.attrs.colwidth
                : [];

              for (let index = 0; index < colspan; index += 1) {
                const width = Number(colwidth[index]);
                widths.push(Number.isFinite(width) && width > 0 ? width : null);
              }
            });
          }

          if (widths.some((width) => Number.isFinite(width))) {
            const encodedWidths = widths
              .map((width) => (Number.isFinite(width) ? String(width) : ""))
              .join(",");
            state.write(`${WIDTH_MARKER_PREFIX}${encodedWidths}]]`);
            state.ensureNewLine();
          }

          state.inTable = true;
          node.forEach((row, p, i) => {
            state.write("| ");
            row.forEach((col, p, j) => {
              if (j) {
                state.write(" | ");
              }

              const cellContent = col.firstChild;
              if (cellContent && cellContent.textContent.trim()) {
                state.renderInline(cellContent);
              }
            });

            state.write(" |");
            state.ensureNewLine();

            if (!i) {
              const delimiterRow = Array.from({ length: row.childCount })
                .map(() => "---")
                .join(" | ");
              state.write(`| ${delimiterRow} |`);
              state.ensureNewLine();
            }
          });

          state.closeBlock(node);
          state.inTable = false;
        },
        parse: {
          ...parentParse,
          updateDOM: (element) => {
            parentParse.updateDOM?.call(this, element);

            // Ensure every cell has at least one block child so that the
            // tableHeader / tableCell schema (content: "block+") is satisfied
            // even when cells are empty after a markdown roundtrip.
            element.querySelectorAll("th, td").forEach((cell) => {
              if (cell.childElementCount === 0) {
                const p = document.createElement("p");
                while (cell.firstChild) {
                  p.appendChild(cell.firstChild);
                }
                cell.appendChild(p);
              }
            });

            const markerParagraphs = Array.from(element.querySelectorAll("p"));

            markerParagraphs.forEach((paragraph) => {
              const markerText = (paragraph.textContent || "").trim();
              const match = markerText.match(WIDTH_MARKER_REGEX);
              if (!match) return;

              let table = paragraph.nextElementSibling;
              while (
                table &&
                table.tagName === "P" &&
                !(table.textContent || "").trim()
              ) {
                table = table.nextElementSibling;
              }

              if (!table || table.tagName !== "TABLE") return;

              const rawWidths = match[1]
                .split(",")
                .map((value) => value.trim());
              const widths = rawWidths.map((value) => {
                const width = Number(value);
                return Number.isFinite(width) && width > 0 ? width : null;
              });

              table.querySelectorAll("tr").forEach((row) => {
                const cells = Array.from(row.querySelectorAll("th, td"));
                cells.forEach((cell, columnIndex) => {
                  const width = widths[columnIndex];
                  if (Number.isFinite(width)) {
                    cell.setAttribute("colwidth", String(width));
                  }
                });
              });

              paragraph.remove();
            });
          },
        },
      },
    };
  },

  addCommands() {
    const parentCommands = this.parent?.() || {};

    return {
      ...parentCommands,
      insertTable:
        (options = {}) =>
        (props) => {
          if (props.editor?.isActive("table")) {
            return false;
          }

          if (!parentCommands.insertTable) {
            return false;
          }

          return parentCommands.insertTable(options)(props);
        },
    };
  },
});

export const TableNode = MarkdownWidthTable.configure({
  resizable: true,
  handleWidth: 10,
  lastColumnResizable: true,
});

export const TableRowNode = TableRow;
export const TableCellNode = TableCell;
export const TableHeaderNode = TableHeader;
