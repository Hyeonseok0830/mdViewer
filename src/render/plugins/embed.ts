import { visit } from 'unist-util-visit';
import type { Root, Paragraph, Link, Text } from 'mdast';

/**
 * remark plugin: transforms ![[filename]] into an embed placeholder div.
 *
 * This plugin runs AFTER remarkWikiLinks. By the time it executes,
 * the source text `![[filename]]` has already been split by remarkWikiLinks into:
 *   [{ type: 'text', value: '!' }, link_node_with_data-wiki]
 *
 * We detect that pattern and convert the enclosing paragraph into:
 *   <div class="embed-note" data-embed="filename.md">Loading...</div>
 *
 * The actual note content is loaded client-side via fetch.
 */
export function remarkEmbed() {
  return (tree: Root) => {
    // Collect nodes to mutate after traversal to avoid modifying during visit
    const toEmbed: { node: Paragraph; embedFile: string }[] = [];

    visit(tree, 'paragraph', (node: Paragraph, index, parent) => {
      if (!parent || typeof index !== 'number') return;

      const children = node.children;
      if (children.length < 2) return;

      // Find '!' text immediately followed by a wiki-link node
      let bangIdx = -1;
      let linkIdx = -1;
      for (let i = 0; i < children.length - 1; i++) {
        const cur = children[i];
        const next = children[i + 1];
        if (
          cur.type === 'text' &&
          (cur as Text).value === '!' &&
          next.type === 'link'
        ) {
          const hProps = (next as Link).data?.hProperties as Record<string, string> | undefined;
          if (hProps?.['data-wiki'] === 'true') {
            bangIdx = i;
            linkIdx = i + 1;
            break;
          }
        }
      }
      if (bangIdx === -1) return;

      // All other children must be pure-whitespace text (e.g. trailing newline)
      for (let i = 0; i < children.length; i++) {
        if (i === bangIdx || i === linkIdx) continue;
        const c = children[i];
        if (c.type !== 'text' || (c as Text).value.trim() !== '') return;
      }

      // Resolve embed filename from the wiki-link's data-target attribute
      const hProps = (children[linkIdx] as Link).data?.hProperties as Record<string, string>;
      const target = hProps['data-target'] ?? '';
      const embedFile = target.endsWith('.md') ? target : `${target}.md`;

      toEmbed.push({ node, embedFile });
    });

    // Apply transformations after traversal
    for (const { node, embedFile } of toEmbed) {
      node.data = {
        hName: 'div',
        hProperties: {
          class: 'embed-note',
          'data-embed': embedFile,
        },
      };
      node.children = [{ type: 'text', value: 'Loading...' }];
    }
  };
}
