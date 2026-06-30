import { visit } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';
import type { Root, Element } from 'hast';
import type { VFile } from 'vfile';
import type { TocItem } from '../../bus.js';

// 헤딩에 id 추가 + VFile에 toc 데이터 주입
export function rehypeToc() {
  return () => (tree: Root, file: VFile) => {
    const toc: TocItem[] = [];

    visit(tree, 'element', (node: Element) => {
      const m = /^h([1-6])$/.exec(node.tagName);
      if (!m) return;

      const depth = parseInt(m[1]) as TocItem['depth'];
      const text = hastToString(node);
      const id = node.properties?.id
        ? String(node.properties.id)
        : slugify(text);

      node.properties = { ...node.properties, id };
      toc.push({ depth, text, id, children: [] });
    });

    (file.data as Record<string, unknown>).toc = toc;
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}
