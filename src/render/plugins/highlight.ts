import { createHighlighter, type Highlighter } from 'shiki';
import { visit } from 'unist-util-visit';
import { toString as hastToString } from 'hast-util-to-string';
import type { Root, Element, ElementContent } from 'hast';

const LANGS = [
  'javascript', 'js', 'typescript', 'ts', 'tsx', 'jsx',
  'python', 'py', 'bash', 'sh', 'zsh',
  'json', 'json5', 'yaml', 'yml', 'toml',
  'markdown', 'md', 'mdx',
  'html', 'css', 'scss', 'less',
  'rust', 'go', 'java', 'kotlin',
  'c', 'cpp', 'csharp', 'cs',
  'sql', 'graphql',
  'dockerfile', 'docker',
  'diff', 'ini', 'xml', 'csv',
  'vue', 'svelte',
  'text', 'plaintext',
] as const;

let _highlighter: Highlighter | null = null;

export async function getHighlighter(): Promise<Highlighter> {
  if (_highlighter) return _highlighter;
  _highlighter = await createHighlighter({
    themes: ['github-light', 'github-dark'],
    langs: LANGS as unknown as string[],
  });
  return _highlighter;
}

export function rehypeShikiPlugin(highlighter: Highlighter) {
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

      const langClass = classes.find(
        (c) => typeof c === 'string' && c.startsWith('language-'),
      );
      const lang = langClass?.slice(9) ?? '';

      if (lang === 'mermaid' || lang === 'math') return; // 각 전용 플러그인이 처리

      const codeText = hastToString(code);
      const resolvedLang = (LANGS as readonly string[]).includes(lang) ? lang : 'text';

      try {
        const hast = highlighter.codeToHast(codeText, {
          lang: resolvedLang,
          themes: { light: 'github-light', dark: 'github-dark' },
        });
        parent.children.splice(index, 1, ...(hast.children as ElementContent[]));
      } catch {
        // 하이라이팅 실패 시 원본 유지
      }
    });
  };
}
