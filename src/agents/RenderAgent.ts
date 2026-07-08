import matter from 'gray-matter';
import { getHighlighter } from '../render/plugins/highlight.js';
import { buildProcessor } from '../render/parser.js';
import { bus, type TocItem } from '../bus.js';

// unified Processor의 정확한 제네릭은 복잡하므로 unknown 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProcessor = { process(input: string): Promise<{ toString(): string; data: unknown }> };

function extractTags(content: string): string[] {
  const noFrontmatter = content.replace(/^---[\s\S]*?---\n?/, '');
  const noCode = noFrontmatter.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
  const pattern = /#([a-zA-Z가-힣][a-zA-Z0-9가-힣_-]*)/g;
  const tags = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(noCode)) !== null) tags.add(m[1]);
  return [...tags];
}

function countWords(content: string): number {
  const noCode = content.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]+`/g, ' ');
  const clean = noCode
    .replace(/!\[.*?\]\(.*?\)/g, ' ')
    .replace(/\[.*?\]\(.*?\)/g, ' ')
    .replace(/#+\s/g, ' ')
    .replace(/[*_~>`#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return clean ? clean.split(/\s+/).length : 0;
}

export class RenderAgent {
  readonly name = 'RenderAgent';
  private processor: AnyProcessor | null = null;

  async start(): Promise<void> {
    process.stdout.write('  shiki 하이라이터 초기화 중...\n');
    const highlighter = await getHighlighter();
    this.processor = buildProcessor(highlighter);
    process.stdout.write('  하이라이터 준비 완료\n');

    bus.typedOn('file:ready', (files) => {
      // 단일 파일 모드: 즉시 렌더링
      // 디렉토리 모드: content가 없으므로 on-demand 렌더링에 맡김
      if (files.length === 1 && files[0].content) {
        this.render(files[0].path, files[0].content);
      }
    });

    bus.typedOn('file:changed', ({ path, content }) => {
      this.render(path, content);
    });
  }

  private async render(filePath: string, raw: string): Promise<void> {
    if (!this.processor) return;

    try {
      const { data: frontmatter, content } = matter(raw);

      const vfile = await this.processor.process(content);
      const html = String(vfile);
      const toc = ((vfile.data as Record<string, unknown>).toc as TocItem[]) ?? [];
      const wikiLinks = ((vfile.data as Record<string, unknown>).wikiLinks as string[]) ?? [];
      const tags = extractTags(raw);
      const wordCount = countWords(content);

      bus.typedEmit('render:done', { path: filePath, html, toc, frontmatter, tags, wordCount, wikiLinks });
    } catch (err) {
      bus.typedEmit('render:error', { path: filePath, error: err as Error });
    }
  }

  /** 이벤트 발행 없이 즉시 렌더링 결과를 반환 (on-demand / 에디터 미리보기용) */
  async renderRaw(raw: string): Promise<{ html: string; toc: TocItem[]; frontmatter: Record<string, unknown>; tags: string[]; wordCount: number; wikiLinks: string[] }> {
    if (!this.processor) throw new Error('RenderAgent 초기화 전입니다');
    const { data: frontmatter, content } = matter(raw);
    const vfile = await this.processor.process(content);
    const wikiLinks = ((vfile.data as Record<string, unknown>).wikiLinks as string[]) ?? [];
    const tags = extractTags(raw);
    const wordCount = countWords(content);
    return {
      html: String(vfile),
      toc: ((vfile.data as Record<string, unknown>).toc as TocItem[]) ?? [],
      frontmatter: frontmatter as Record<string, unknown>,
      tags,
      wordCount,
      wikiLinks,
    };
  }

  async stop(): Promise<void> {}
}
