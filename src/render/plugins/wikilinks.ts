import { visit } from 'unist-util-visit';
import type { Root, Text, Link, PhrasingContent, Parent } from 'mdast';
import type { VFile } from 'vfile';

export function remarkWikiLinks() {
  return (tree: Root, file: VFile) => {
    const links: string[] = [];
    const pattern = /\[\[([^\[\]]+)\]\]/g;
    const replacements: { parent: Parent; index: number; parts: PhrasingContent[] }[] = [];

    visit(tree, 'text', (node: Text, index, parent) => {
      if (!parent || typeof index !== 'number') return;
      const value = node.value;
      pattern.lastIndex = 0;
      if (!pattern.test(value)) return;
      pattern.lastIndex = 0;

      const parts: PhrasingContent[] = [];
      let lastIdx = 0;
      let match: RegExpExecArray | null;

      while ((match = pattern.exec(value)) !== null) {
        if (match.index > lastIdx) parts.push({ type: 'text', value: value.slice(lastIdx, match.index) });
        const name = match[1].trim();
        links.push(name);
        const href = '?file=' + encodeURIComponent(name.endsWith('.md') ? name : name + '.md');
        const linkNode: Link = {
          type: 'link', url: href, title: null,
          data: { hProperties: { 'data-wiki': 'true', class: 'wiki-link' } },
          children: [{ type: 'text', value: name }],
        };
        parts.push(linkNode);
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < value.length) parts.push({ type: 'text', value: value.slice(lastIdx) });
      replacements.push({ parent: parent as Parent, index, parts });
    });

    for (let i = replacements.length - 1; i >= 0; i--) {
      const { parent, index, parts } = replacements[i];
      parent.children.splice(index, 1, ...(parts as typeof parent.children));
    }

    (file.data as Record<string, unknown>).wikiLinks = [...new Set(links)];
  };
}
