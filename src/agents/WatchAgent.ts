import chokidar, { type FSWatcher } from 'chokidar';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { bus } from '../bus.js';

export class WatchAgent {
  readonly name = 'WatchAgent';
  private watcher: FSWatcher | null = null;
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly resolved: string;

  constructor(inputPath: string) {
    this.resolved = inputPath;
  }

  async start(): Promise<void> {
    const s = await stat(this.resolved).catch(() => null);
    const isDir = s?.isDirectory() ?? false;

    if (isDir) {
      this.watcher = chokidar.watch('**/*.md', {
        cwd: this.resolved,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
      });
      this.watcher.on('change', (rel) => this.handleChange(join(this.resolved, rel)));
    } else {
      this.watcher = chokidar.watch(this.resolved, {
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 150, pollInterval: 50 },
      });
      this.watcher.on('change', (p) => this.handleChange(p));
    }

    this.watcher.on('error', (err) =>
      process.stderr.write(`WatchAgent: ${err}\n`),
    );
  }

  private handleChange(filePath: string): void {
    const existing = this.debounceTimers.get(filePath);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      this.debounceTimers.delete(filePath);
      try {
        const content = await readFile(filePath, 'utf-8');
        bus.typedEmit('file:changed', { path: filePath, content });
      } catch (err) {
        process.stderr.write(`WatchAgent: ${filePath} 읽기 실패 — ${err}\n`);
      }
    }, 150);

    this.debounceTimers.set(filePath, timer);
  }

  async stop(): Promise<void> {
    for (const timer of this.debounceTimers.values()) clearTimeout(timer);
    await this.watcher?.close();
  }
}
