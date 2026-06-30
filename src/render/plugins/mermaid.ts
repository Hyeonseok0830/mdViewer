import { visit } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';
import type { Root, Element } from 'hast';

// <pre><code class="language-mermaid">...</code></pre>
// → <div class="mermaid">...</div>  (클라이언트에서 mermaid.js가 렌더링)
export function rehypeMermaid() {
  return () => (tree: Root) => {
    visit(tree, 'element', (node: Element, index, parent) => {
      if (node.tagName !== 'pre' || parent == null || index == null) return;

      const codeNode = node.children[0];
      if (
        !codeNode ||
        codeNode.type !== 'element' ||
        (codeNode as Element).tagName !== 'code'
      ) return;

      const code = codeNode as Element;
      const classes = Array.isArray(code.properties?.className)
        ? (code.properties.className as string[])
        : [];

      if (!classes.includes('language-mermaid')) return;

      const diagram = hastToString(code);
      parent.children.splice(index, 1, {
        type: 'element',
        tagName: 'div',
        properties: { className: ['mermaid'] },
        children: [{ type: 'text', value: diagram }],
      });
    });
  };
}
