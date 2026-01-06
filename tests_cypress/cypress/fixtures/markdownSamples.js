export const MARKDOWN = {
    HEADINGS: {
        before: `# HEADINGS
# Heading level 1
## Heading level 2
# Heading level 1 with ((variable_display))
## Heading level 2 with ((variable_display))
# Heading level 1 with *italicized text*
## Heading level 2 with *italicized text*
# Heading level 1 with *italicized ((variable_heading1))*
## Heading level 2 with *italicized ((variable_heading2))*
## Heading level 2 with ((variable)) next to *italic*
# Heading level 1 with ((variable_with_underscores_like_this))
## Heading level 2 with ((variable)) and trailing punctuation!`,
        expected: `# HEADINGS

# Heading level 1

## Heading level 2

# Heading level 1 with ((variable_display))

## Heading level 2 with ((variable_display))

# Heading level 1 with *italicized text*

## Heading level 2 with *italicized text*

# Heading level 1 with *italicized ((variable_heading1))*

## Heading level 2 with *italicized ((variable_heading2))*

## Heading level 2 with ((variable)) next to *italic*

# Heading level 1 with ((variable_with_underscores_like_this))

## Heading level 2 with ((variable)) and trailing punctuation!`,
    },
VARIABLES: {
        before: `^ # 2. VARIABLES

((variable_by_itself))

Inline: ((campaign_name)) is a highlight Nested: Combine with formatting: **((bold_variable))** and *((italic_variable))*

- In a bullet ((list))

1. in a numbered ((list))

^ In a ((blockquote))

[[en]]in an ((english_block))

[[fr]]in an ((french_block))`,
        expected: `^ # 2. VARIABLES

((variable_by_itself))

Inline: ((campaign_name)) is a highlight Nested: Combine with formatting: **((bold_variable))** and *((italic_variable))*

- In a bullet ((list))

1. in a numbered ((list))

^ In a ((blockquote))

[[en]]
in an ((english_block))
[[/en]]

[[fr]]
in an ((french_block))
[[/fr]]`,
},
    TEXT_STYLES: {
        before: `^ # 3. TEXT STYLES

Some **bold** and _italic_ text

- Some **bold** and _italic_ text in a bullet list

1. Some **bold** and _italic_ text in a numbered list

^ Some **bold** and _italic_ text in a blockquote

# Some **bold** and _italic_ text in a heading

## Some **bold** and _italic_ text in a heading 2

[[en]]# Some **bold** and _italic_ text in an english block

[[fr]]# Some **bold** and _italic_ text in a french block`,
        expected: `^ # 3. TEXT STYLES

Some **bold** and *italic* text

- Some **bold** and *italic* text in a bullet list

1. Some **bold** and *italic* text in a numbered list

^ Some **bold** and *italic* text in a blockquote

# Some **bold** and *italic* text in a heading

## Some **bold** and *italic* text in a heading 2

[[en]]
# Some **bold** and *italic* text in an english block
[[/en]]

[[fr]]
# Some **bold** and *italic* text in a french block
[[/fr]]`,
    },
    LIST_STYLES: {
        before: `^ 4. LISTS


- Bullet
List

---

* Bullet
List


1. Numbered
List


^ - Blockquote
Bullet List



^ * Blockquote
Bullet List



^ 1. Blockquote
Numbered List



[[en]]- EN Bullet
List



[[en]]* EN Bullet
List



[[en]]1. EN Numbered
List



[[fr]]- FR Bullet
List



[[fr]]* FR Bullet
List



[[fr]]1. FR Numbered
List`,
        expected: `^ 4. LISTS

- Bullet
- List

---

- Bullet
- List

1. Numbered
2. List

^ - Blockquote
^ - Bullet List

^ - Blockquote
^ - Bullet List

^ 1. Blockquote
^ 2. Numbered List

[[en]]
- EN Bullet
- List
[[/en]]

[[en]]
- EN Bullet
- List
[[/en]]

[[en]]
1. EN Numbered
2. List
[[/en]]

[[fr]]
- FR Bullet
- List
[[/fr]]

[[fr]]
- FR Bullet
- List
[[/fr]]

[[fr]]
1. FR Numbered
2. List
[[/fr]]`
    },
    LINKS: {
        before: `^ # 5. LINKS

[Normal link](https://www.canada.ca)

- [Bullet List link](https://www.canada.ca)

1. [Numbered List link](https://www.canada.ca)

**[Bold link](https://www.canada.ca)**

_[Italic link](https://www.canada.ca)_

[((variable_link))](https://www.canada.ca)

^ [Blockquote link](https://www.canada.ca)

[[en]][EN link](https://www.canada.ca)

[[fr]][FR link](https://www.canada.ca)`,
        expected: `^ # 5. LINKS

[Normal link](https://www.canada.ca)

- [Bullet List link](https://www.canada.ca)

1. [Numbered List link](https://www.canada.ca)

[**Bold link**](https://www.canada.ca)

[*Italic link*](https://www.canada.ca)

[((variable_link))](https://www.canada.ca)

^ [Blockquote link](https://www.canada.ca)

[[en]]
[EN link](https://www.canada.ca)
[[/en]]

[[fr]]
[FR link](https://www.canada.ca)
[[/fr]]`
    },
    LANG_BLOCKS: {
        before: `^ # 6. LANGUAGE BLOCKS

[[en]]Basic EN Block!

[[fr]]Basic FR Block!

^ [[en]]EN block in a quote



^ [[fr]]FR block in a quote


[[en]]# HEADING 1 in EN block


[[fr]]# HEADING 1 in FR block


[[en]]## HEADING 2 in EN block


[[fr]]## HEADING 2 in FR block


[[en]]((variable)) in EN block


[[fr]]((variable)) in FR block


[[en]]**bold** in EN block
_italics_ in EN block


[[fr]]**bold** in FR block
_italics_ in FR block


[[en]]- bullet list in
en block



[[en]]1. numbered list in
en block


[[fr]]- bullet list in
fr block



[[fr]]1. numbered list in
fr block



[[en]][link](https://www.google.ca) in EN block



[[fr]][link](https://www.google.ca) in FR block

`,
        expected: `^ # 6. LANGUAGE BLOCKS

[[en]]
Basic EN Block!
[[/en]]

[[fr]]
Basic FR Block!
[[/fr]]

^ [[en]]
^ EN block in a quote
^ [[/en]]

^ [[fr]]
^ FR block in a quote
^ [[/fr]]

[[en]]
# HEADING 1 in EN block
[[/en]]

[[fr]]
# HEADING 1 in FR block
[[/fr]]

[[en]]
## HEADING 2 in EN block
[[/en]]

[[fr]]
## HEADING 2 in FR block
[[/fr]]

[[en]]
((variable)) in EN block
[[/en]]

[[fr]]
((variable)) in FR block
[[/fr]]

[[en]]
**bold** in EN block

*italics* in EN block
[[/en]]

[[fr]]
**bold** in FR block

*italics* in FR block
[[/fr]]

[[en]]
- bullet list in
- en block
[[/en]]

[[en]]
1. numbered list in
2. en block
[[/en]]

[[fr]]
- bullet list in
- fr block
[[/fr]]

[[fr]]
1. numbered list in
2. fr block
[[/fr]]

[[en]]
[link in EN block](https://www.google.ca)
[[/en]]

[[fr]]
[link in FR block](https://www.google.ca)
[[/fr]]`
    }
};

export default MARKDOWN;