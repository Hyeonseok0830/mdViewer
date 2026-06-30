import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeSlug from 'rehype-slug';
import rehypeKatex from 'rehype-katex';
import rehypeStringify from 'rehype-stringify';
import type { Highlighter } from 'shiki';
import { rehypeShikiPlugin } from './plugins/highlight.js';
import { rehypeMermaid } from './plugins/mermaid.js';
import { rehypeToc } from './plugins/toc.js';

// rehype-katex의 output 옵션 타입이 좁으므로 명시
const KATEX_OPTIONS = { output: 'html' as const, throwOnError: false };

export function buildProcessor(highlighter: Highlighter) {
  const shikiPlugin = rehypeShikiPlugin(highlighter);
  const mermaidPlugin = rehypeMermaid();
  const tocPlugin = rehypeToc();

  return unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkRehype, { allowDangerousHtml: false })
    .use(rehypeSlug)         // 헤딩에 id 추가 (rehypeToc보다 먼저)
    .use(tocPlugin)          // toc 추출 (slug가 붙은 뒤)
    .use(rehypeKatex, KATEX_OPTIONS) // KaTeX를 shiki 전에 실행해야 math 노드 처리 가능
    .use(mermaidPlugin)      // mermaid 블록 변환
    .use(shikiPlugin)        // 코드 블록 하이라이팅 (math/mermaid는 스킵)
    .use(rehypeStringify);
}
