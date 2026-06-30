import matter from 'gray-matter';
import { getHighlighter } from '../render/plugins/highlight.js';
import { buildProcessor } from '../render/parser.js';
import { bus, type TocItem } from '../bus.js';

// unified Processor의 정확한 제네릭은 복잡하므로 unknown 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyProcessor = { process(input: string): Promise<{ toString(): string; data: unknown }> };

export class RenderAgent {
  readonly name = 'RenderAgent';
  private processor: AnyProcessor | null = null;

  async start(): Promise<void> {
    process.stdout.write('  shiki 하이라이터 초기화 중...\n');
    const highlighter = await getHighlighter();
    this.processor = buildProcessor(highlighter);
    process.stdout.write('  하이라이터 준비 완료\n');

    bus.typedOn('file:ready', (files) => {
      // 단일 파일 모드: 즉시 렌더링.
      // 디렉토리 모드: 자동 선택하지 않고 사용자가 사이드바에서 파일을 클릭할 때 on-demand 렌더링.
      if (files.length === 1) this.render(files[0].path, files[0].content);
    });

    bus.typedOn('file:changed', ({ path, content }) => {
      this.render(path, content);
    });
  }

  private async render(filePath: string, raw: string): Promise<void> {
    if (!this.processor) return;

    try {
      // frontmatter 분리
      const { data: frontmatter, content } = matter(raw);

      // unified 파이프라인 실행
      const vfile = await this.processor.process(content);
      const html = String(vfile);
      const toc = ((vfile.data as Record<string, unknown>).toc as TocItem[]) ?? [];

      bus.typedEmit('render:done', { path: filePath, html, toc, frontmatter });
    } catch (err) {
      bus.typedEmit('render:error', { path: filePath, error: err as Error });
    }
  }

  /** 이벤트 발행 없이 즉시 렌더링 결과를 반환 (on-demand / 에디터 미리보기용) */
  async renderRaw(raw: string): Promise<{ html: string; toc: TocItem[]; frontmatter: Record<string, unknown> }> {
    if (!this.processor) throw new Error('RenderAgent 초기화 전입니다');
    const { data: frontmatter, content } = matter(raw);
    const vfile = await this.processor.process(content);
    return {
      html: String(vfile),
      toc: ((vfile.data as Record<string, unknown>).toc as TocItem[]) ?? [],
      frontmatter: frontmatter as Record<string, unknown>,
    };
  }

  async stop(): Promise<void> {}
}
