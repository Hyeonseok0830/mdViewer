import { visit } from 'unist-util-visit';
import type { Root, Element, Text, ElementContent } from 'hast';

const CALLOUT_ICONS: Record<string, string> = {
  note: 'ℹ',
  tip: '💡',
  warning: '⚠',
  important: '❗',
  caution: '🔴',
  info: 'ℹ',
  success: '✅',
  question: '❓',
  bug: '🐛',
  example: '📌',
};

const CALLOUT_PATTERN = /^\[!([a-zA-Z]+)\](.*)/;

export function rehypeCallouts() {
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'blockquote' || parent == null || index == null) return;

      const firstP = node.children.find(
        (c): c is Element => c.type === 'element' && (c as Element).tagName === 'p',
      );
      if (!firstP) return;

      const firstText = firstP.children.find((c): c is Text => c.type === 'text');
      if (!firstText) return;

      const match = CALLOUT_PATTERN.exec(firstText.value);
      if (!match) return;

      const type = match[1].toLowerCase();
      const icon = CALLOUT_ICONS[type] ?? 'ℹ';
      const label = type.charAt(0).toUpperCase() + type.slice(1);
      const inlineTitle = match[2].trim();

      // Remove the matched marker from the first text node
      const restOfText = inlineTitle;
      if (restOfText) {
        firstText.value = restOfText;
      } else {
        // Remove the text node; if paragraph becomes empty, remove it
        firstP.children.splice(firstP.children.indexOf(firstText), 1);
        const hasContent = firstP.children.some(
          (c) => c.type !== 'text' || (c as Text).value.trim() !== '',
        );
        if (!hasContent) {
          node.children.splice(node.children.indexOf(firstP), 1);
        }
      }

      const titleNode: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout-title'] },
        children: [
          {
            type: 'element',
            tagName: 'span',
            properties: { className: ['callout-icon'] },
            children: [{ type: 'text', value: icon }],
          } as Element,
          {
            type: 'element',
            tagName: 'span',
            properties: {},
            children: [{ type: 'text', value: label }],
          } as Element,
        ],
      };

      const calloutDiv: Element = {
        type: 'element',
        tagName: 'div',
        properties: { className: ['callout', `callout-${type}`] },
        children: [titleNode, ...(node.children as ElementContent[])],
      };

      (parent.children as ElementContent[]).splice(index, 1, calloutDiv);
    });
  };
}
