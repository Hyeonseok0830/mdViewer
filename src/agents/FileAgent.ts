import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, extname, join, basename } from 'node:path';
import { bus, type FileReadyPayload } from '../bus.js';

const IGNORE_DIRS = new Set([
  '.git', 'node_modules', '.obsidian', '.trash', '.vscode', '.idea',
  'dist', 'build', 'out', '.next', '.nuxt', '__pycache__', '.cache',
  '.DS_Store', 'vendor', '.yarn', '.pnp',
]);

export class FileAgent {
  readonly name = 'FileAgent';
  private readonly resolved: string;

  constructor(inputPath: string) {
    this.resolved = resolve(inputPath);
  }

  async start(): Promise<void> {
    let s;
    try {
      s = await stat(this.resolved);
    } catch {
      process.stderr.write(`FileAgent: 경로를 찾을 수 없습니다 — ${this.resolved}\n`);
      process.exit(1);
    }

    if (s.isDirectory()) {
      const paths = await this.findMdFiles(this.resolved);
      if (paths.length === 0) {
        process.stderr.write(`FileAgent: .md 파일이 없습니다 — ${this.resolved}\n`);
        process.exit(1);
      }
      // 파일 목록만 즉시 반환 — 내용은 on-demand 로드
      bus.typedEmit('file:ready', paths.map((p) => ({ path: p, content: '', mtime: new Date(0) })));
    } else {
      // 단일 파일 모드: 내용 즉시 읽어 렌더링
      const result = await this.load(this.resolved);
      if (!result) {
        process.stderr.write('FileAgent: 읽을 수 있는 .md 파일이 없습니다.\n');
        process.exit(1);
      }
      bus.typedEmit('file:ready', [result]);
    }
  }

  private async findMdFiles(dir: string): Promise<string[]> {
    const results: string[] = [];
    await this.walk(dir, results);
    results.sort((a, b) => basename(a).localeCompare(basename(b)));
    return results;
  }

  private async walk(dir: string, out: string[]): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    await Promise.all(
      entries.map((e) => {
        if (e.isDirectory()) {
          if (!IGNORE_DIRS.has(e.name) && !e.name.startsWith('.')) {
            return this.walk(join(dir, e.name), out);
          }
          return;
        }
        if (e.isFile() && extname(e.name).toLowerCase() === '.md') {
          out.push(join(e.parentPath ?? dir, e.name));
        }
      }),
    );
  }

  async load(filePath: string): Promise<FileReadyPayload | null> {
    if (extname(filePath).toLowerCase() !== '.md') {
      process.stderr.write(`FileAgent: ${filePath} — .md 파일이 아닙니다.\n`);
      return null;
    }
    try {
      const [content, stats] = await Promise.all([
        readFile(filePath, 'utf-8'),
        stat(filePath),
      ]);
      return { path: filePath, content, mtime: stats.mtime };
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code;
      process.stderr.write(
        `FileAgent: ${filePath} — ${code === 'ENOENT' ? '파일 없음' : '읽기 권한 없음'}\n`,
      );
      return null;
    }
  }

  async stop(): Promise<void> {}
}
