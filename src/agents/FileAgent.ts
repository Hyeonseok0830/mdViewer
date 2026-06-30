import { readFile, stat, readdir } from 'node:fs/promises';
import { resolve, extname, join, basename } from 'node:path';
import { bus, type FileReadyPayload } from '../bus.js';

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

    const files = s.isDirectory()
      ? await this.findMdFiles(this.resolved)
      : [this.resolved];

    if (files.length === 0) {
      process.stderr.write(`FileAgent: .md 파일이 없습니다 — ${this.resolved}\n`);
      process.exit(1);
    }

    const loaded = (await Promise.all(files.map((p) => this.load(p)))).filter(
      (r): r is FileReadyPayload => r !== null,
    );

    if (loaded.length === 0) {
      process.stderr.write('FileAgent: 읽을 수 있는 .md 파일이 없습니다.\n');
      process.exit(1);
    }

    bus.typedEmit('file:ready', loaded);
  }

  private async findMdFiles(dir: string): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true, recursive: true });
    return entries
      .filter((e) => e.isFile() && extname(e.name).toLowerCase() === '.md')
      .map((e) => join(e.parentPath, e.name))
      .sort((a, b) => basename(a).localeCompare(basename(b)));
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
