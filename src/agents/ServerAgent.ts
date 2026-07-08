import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebSocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { resolve, relative, dirname, basename, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { bus, type TocItem } from '../bus.js';
import { buildHtml } from '../server/template.js';
import type { RenderAgent } from './RenderAgent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KATEX_DIST  = resolve(__dirname, '../../node_modules/katex/dist');
const DEFAULT_VENDOR_DIR  = resolve(__dirname, '../../../assets/vendor');

interface RenderCache {
  html: string;
  toc: TocItem[];
  frontmatter: Record<string, unknown>;
}

interface TreeNode {
  name: string;
  path: string;
  absPath: string;
  type: 'file' | 'dir';
  children: TreeNode[];
}

export class ServerAgent {
  readonly name = 'ServerAgent';
  private app = Fastify({ logger: false });
  private clients = new Set<WebSocket>();
  private renders = new Map<string, RenderCache>();
  private fileList: { name: string; relativePath: string; absolutePath: string }[] = [];
  private renderAgent: RenderAgent | null = null;
  private fileListReady: Promise<void>;
  private resolveFileList!: () => void;
  private backlinksIndex = new Map<string, Set<string>>();
  private tagsIndex = new Map<string, Set<string>>();
  private wordCounts = new Map<string, number>();
  private contentIndex = new Map<string, string>();

  constructor(
    private port: number = 3000,
    private rootDir: string = '',
    private isDir: boolean = false,
    private katexPath: string = DEFAULT_KATEX_DIST,
    private vendorPath: string = DEFAULT_VENDOR_DIR,
  ) {
    this.fileListReady = new Promise((resolve) => { this.resolveFileList = resolve; });
  }

  setRenderAgent(ra: RenderAgent): void {
    this.renderAgent = ra;
  }

  async start(): Promise<void> {
    await this.app.register(fastifyStatic, {
      root: this.katexPath,
      prefix: '/katex/',
    });

    await this.app.register(fastifyStatic, {
      root: this.vendorPath,
      prefix: '/vendor/',
      decorateReply: false,
    });

    await this.app.register(fastifyWebSocket);

    // ── 초기 뷰어 페이지 ──────────────────────────────
    this.app.get('/', async (req, reply) => {
      await this.fileListReady;
      const queryFile = (req.query as Record<string, string>).file;
      const displayPath = this.isDir && !queryFile ? '' : this.resolveDisplayPath(queryFile);
      const render = displayPath ? this.renders.get(displayPath) : undefined;

      reply.header('Content-Type', 'text/html; charset=utf-8');
      return buildHtml(
        displayPath,
        render?.html ?? '',
        render?.frontmatter,
        {
          isDir: this.isDir,
          files: this.fileList,
          currentPath: displayPath,
          tree: this.buildTree(),
        },
      );
    });

    // ── 파일 목록 API ─────────────────────────────────
    this.app.get('/api/files', async () => this.fileList);

    // ── 파일 트리 API ─────────────────────────────────
    this.app.get('/api/tree', async () => this.buildTree());

    // ── 렌더된 HTML API (캐시 미스 시 on-demand 렌더링) ──
    this.app.get('/api/render', async (req, reply) => {
      const relPath = (req.query as Record<string, string>).file;
      if (!relPath) return reply.code(400).send({ error: 'file 파라미터가 필요합니다' });

      const abs = resolve(this.rootDir, relPath);
      if (!this.isSafePath(abs)) return reply.code(403).send({ error: '허용되지 않는 경로' });

      let cached = this.renders.get(abs);

      if (!cached) {
        if (!this.renderAgent) return reply.code(503).send({ error: '렌더러 준비 중' });
        try {
          const raw = await readFile(abs, 'utf-8');
          const result = await this.renderAgent.renderRaw(raw);
          cached = result;
          this.renders.set(abs, cached);
          this.wordCounts.set(abs, result.wordCount);
        } catch {
          return reply.code(404).send({ error: '파일을 찾을 수 없거나 렌더링 실패' });
        }
      }

      return {
        ...cached,
        relativePath: relative(this.rootDir, abs),
        absolutePath: abs,
        name: basename(abs),
        wordCount: this.wordCounts.get(abs) ?? 0,
      };
    });

    // ── 원본 마크다운 API (에디터용) ─────────────────
    this.app.get('/api/raw', async (req, reply) => {
      const relPath = (req.query as Record<string, string>).file;
      if (!relPath) return reply.code(400).send({ error: 'file 파라미터가 필요합니다' });

      const abs = resolve(this.rootDir, relPath);
      if (!this.isSafePath(abs)) return reply.code(403).send({ error: '허용되지 않는 경로' });

      try {
        const content = await readFile(abs, 'utf-8');
        return { content };
      } catch {
        return reply.code(404).send({ error: '파일 없음' });
      }
    });

    // ── 실시간 미리보기 API (에디터 입력 중) ─────────
    this.app.post('/api/preview', async (req, reply) => {
      if (!this.renderAgent) return reply.code(503).send({ error: '렌더러 준비 중' });
      const { content } = req.body as { content: string };
      if (typeof content !== 'string') return reply.code(400).send({ error: '유효하지 않은 요청' });
      try {
        return await this.renderAgent.renderRaw(content);
      } catch (err) {
        return reply.code(500).send({ error: (err as Error).message });
      }
    });

    // ── 파일 저장 API ──────────────────────────────
    this.app.post('/api/save', async (req, reply) => {
      const { path: relPath, content } = req.body as { path: string; content: string };
      if (!relPath || typeof content !== 'string') return reply.code(400).send({ error: '유효하지 않은 요청' });

      const abs = resolve(this.rootDir, relPath);
      if (!this.isSafePath(abs)) return reply.code(403).send({ error: '허용되지 않는 경로' });

      try {
        await writeFile(abs, content, 'utf-8');
        return { ok: true };
      } catch (err) {
        return reply.code(500).send({ error: (err as Error).message });
      }
    });

    // ── 백링크 API ────────────────────────────────────
    this.app.get('/api/backlinks', async (req, reply) => {
      const rel = (req.query as Record<string, string>).file;
      if (!rel) return reply.code(400).send({ error: 'file 파라미터가 필요합니다' });
      const abs = resolve(this.rootDir, rel);
      const sources = this.backlinksIndex.get(abs) ?? new Set();
      const backlinks = [...sources]
        .map(s => this.fileList.find(f => f.absolutePath === s))
        .filter(Boolean);
      return { backlinks };
    });

    // ── 태그 API ──────────────────────────────────────
    this.app.get('/api/tags', async () => {
      const tags = [...this.tagsIndex.entries()]
        .map(([name, files]) => ({
          name,
          count: files.size,
          files: [...files].map(abs => this.fileList.find(f => f.absolutePath === abs)).filter(Boolean),
        }))
        .sort((a, b) => b.count - a.count);
      return { tags };
    });

    // ── 전문 검색 API ─────────────────────────────────
    this.app.get('/api/search', async (req) => {
      const q = ((req.query as Record<string, string>).q ?? '').toLowerCase().trim();
      if (!q || q.length < 2) return { results: [] };
      const results = [];
      for (const f of this.fileList) {
        const content = this.contentIndex.get(f.absolutePath) ?? '';
        const lc = content.toLowerCase();
        if (!lc.includes(q)) continue;
        const idx = lc.indexOf(q);
        const start = Math.max(0, idx - 60);
        const end = Math.min(content.length, idx + q.length + 60);
        const snippet = (start > 0 ? '...' : '') + content.slice(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');
        results.push({ name: f.name, relativePath: f.relativePath, absolutePath: f.absolutePath, snippet });
      }
      return { results: results.slice(0, 50) };
    });

    // ── 그래프 API ────────────────────────────────────
    this.app.get('/api/graph', async () => {
      const nodes = this.fileList.map(f => ({
        id: f.absolutePath,
        label: f.name.replace(/\.md$/i, ''),
        relativePath: f.relativePath,
        absolutePath: f.absolutePath,
      }));
      const edges: { source: string; target: string }[] = [];
      for (const [target, sources] of this.backlinksIndex) {
        for (const source of sources) {
          if (this.fileList.find(f => f.absolutePath === source) && this.fileList.find(f => f.absolutePath === target)) {
            edges.push({ source, target });
          }
        }
      }
      return { nodes, edges };
    });

    // ── 단어 수 API ───────────────────────────────────
    this.app.get('/api/wordcount', async (req, reply) => {
      const rel = (req.query as Record<string, string>).file;
      if (!rel) return reply.code(400).send({ error: 'file 파라미터가 필요합니다' });
      const abs = resolve(this.rootDir, rel);
      return { wordCount: this.wordCounts.get(abs) ?? 0 };
    });

    // ── 미리보기 API ──────────────────────────────────
    this.app.get('/api/preview', async (req, reply) => {
      const rel = (req.query as Record<string, string>).file;
      if (!rel) return reply.code(400).send({ error: 'file 파라미터가 필요합니다' });
      const abs = resolve(this.rootDir, rel);
      if (!this.isSafePath(abs)) return reply.code(403).send({ error: '허용되지 않는 경로' });

      let html: string;

      if (this.renders.has(abs)) {
        // Already cached — return truncated version for hover preview
        html = this.renders.get(abs)!.html.slice(0, 2000);
      } else {
        // Not cached yet — render on demand
        if (!this.renderAgent) return reply.code(503).send({ error: 'RenderAgent이 준비되지 않았습니다' });
        try {
          const raw = await readFile(abs, 'utf-8');
          const result = await this.renderAgent.renderRaw(raw);
          html = result.html.slice(0, 2000);
        } catch (err) {
          return reply.code(404).send({ error: (err as Error).message });
        }
      }

      // Extract title from the first <h1> tag, or fall back to the filename
      const h1Match = /<h1[^>]*>(.*?)<\/h1>/i.exec(html);
      const title = h1Match
        ? h1Match[1].replace(/<[^>]+>/g, '')
        : basename(rel).replace(/\.md$/i, '');

      return { html, title };
    });

    // ── 파일 생성 API ─────────────────────────────────
    this.app.post('/api/files/new', async (req, reply) => {
      if (!this.isDir) return reply.code(400).send({ error: '디렉토리 모드에서만 사용 가능' });
      const { dir = '', name } = req.body as { dir?: string; name: string };
      if (!name) return reply.code(400).send({ error: '파일명이 필요합니다' });
      const safeName = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
      if (!safeName) return reply.code(400).send({ error: '유효하지 않은 파일명' });
      const filename = safeName.endsWith('.md') ? safeName : safeName + '.md';
      const absDir = dir ? resolve(this.rootDir, dir) : this.rootDir;
      const abs = join(absDir, filename);
      if (!this.isSafePath(abs)) return reply.code(403).send({ error: '허용되지 않는 경로' });
      const rel = relative(this.rootDir, abs).replace(/\\/g, '/');
      try {
        await writeFile(abs, `# ${safeName.replace(/\.md$/i, '')}\n\n`, { flag: 'wx' });
        const newEntry = { name: filename, relativePath: rel, absolutePath: abs };
        this.fileList.push(newEntry);
        this.contentIndex.set(abs, `# ${safeName.replace(/\.md$/i, '')}\n\n`);
        this.fileList.sort((a, b) => a.name.localeCompare(b.name));
        this.broadcast({ type: 'tree:update', tree: this.buildTree(), files: this.fileList });
        return { relativePath: rel, absolutePath: abs };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') return reply.code(409).send({ error: '파일이 이미 존재합니다' });
        return reply.code(500).send({ error: (err as Error).message });
      }
    });

    // ── 파일 이름 변경 API ─────────────────────────
    this.app.post('/api/files/rename', async (req, reply) => {
      if (!this.isDir) return reply.code(400).send({ error: '디렉토리 모드에서만 사용 가능' });
      const { path: relPath, newName } = req.body as { path: string; newName: string };
      if (!relPath || !newName) return reply.code(400).send({ error: '유효하지 않은 요청' });
      const safeName = newName.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim();
      if (!safeName) return reply.code(400).send({ error: '유효하지 않은 파일명' });
      const finalName = safeName.endsWith('.md') ? safeName : safeName + '.md';
      const absOld = resolve(this.rootDir, relPath);
      if (!this.isSafePath(absOld)) return reply.code(403).send({ error: '허용되지 않는 경로' });
      const absNew = join(dirname(absOld), finalName);
      if (!this.isSafePath(absNew)) return reply.code(403).send({ error: '허용되지 않는 경로' });
      const relNew = relative(this.rootDir, absNew).replace(/\\/g, '/');
      try {
        await rename(absOld, absNew);
        const content = this.contentIndex.get(absOld);
        const renderCache = this.renders.get(absOld);
        const wc = this.wordCounts.get(absOld);
        if (content !== undefined) { this.contentIndex.delete(absOld); this.contentIndex.set(absNew, content); }
        if (renderCache !== undefined) { this.renders.delete(absOld); this.renders.set(absNew, renderCache); }
        if (wc !== undefined) { this.wordCounts.delete(absOld); this.wordCounts.set(absNew, wc); }
        const entry = this.fileList.find(f => f.absolutePath === absOld);
        if (entry) { entry.absolutePath = absNew; entry.relativePath = relNew; entry.name = finalName; }
        const sources = this.backlinksIndex.get(absOld);
        if (sources) { this.backlinksIndex.delete(absOld); this.backlinksIndex.set(absNew, sources); }
        for (const files of this.tagsIndex.values()) {
          if (files.has(absOld)) { files.delete(absOld); files.add(absNew); }
        }
        this.fileList.sort((a, b) => a.name.localeCompare(b.name));
        this.broadcast({ type: 'tree:update', tree: this.buildTree(), files: this.fileList });
        return { relativePath: relNew, absolutePath: absNew };
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') return reply.code(409).send({ error: '파일이 이미 존재합니다' });
        return reply.code(500).send({ error: (err as Error).message });
      }
    });

    // ── 파일 삭제 API ──────────────────────────────
    this.app.delete('/api/files', async (req, reply) => {
      if (!this.isDir) return reply.code(400).send({ error: '디렉토리 모드에서만 사용 가능' });
      const relPath = (req.query as Record<string, string>).file;
      if (!relPath) return reply.code(400).send({ error: 'file 파라미터가 필요합니다' });
      const abs = resolve(this.rootDir, relPath);
      if (!this.isSafePath(abs)) return reply.code(403).send({ error: '허용되지 않는 경로' });
      try {
        await unlink(abs);
        this.contentIndex.delete(abs);
        this.renders.delete(abs);
        this.wordCounts.delete(abs);
        this.backlinksIndex.delete(abs);
        for (const srcs of this.backlinksIndex.values()) srcs.delete(abs);
        for (const files of this.tagsIndex.values()) files.delete(abs);
        this.fileList = this.fileList.filter(f => f.absolutePath !== abs);
        this.broadcast({ type: 'tree:update', tree: this.buildTree(), files: this.fileList });
        return { ok: true };
      } catch (err) {
        return reply.code(500).send({ error: (err as Error).message });
      }
    });

    // ── WebSocket ──────────────────────────────────
    await this.app.register(async (fastify) => {
      fastify.get('/ws', { websocket: true }, (socket: WebSocket) => {
        this.clients.add(socket);
        const first = [...this.renders.entries()][0];
        if (first) {
          const [path, render] = first;
          socket.send(JSON.stringify({ type: 'update', path, ...render }));
        }
        socket.on('close', () => this.clients.delete(socket));
      });
    });

    // ── 이벤트 리스닝 ─────────────────────────────────
    bus.typedOn('file:ready', (files) => {
      this.fileList = files.map((f) => ({
        name: basename(f.path),
        relativePath: this.rootDir ? relative(this.rootDir, f.path) : basename(f.path),
        absolutePath: f.path,
      }));
      for (const f of files) {
        this.contentIndex.set(f.path, f.content);
      }
      this.resolveFileList();
      this.broadcast({ type: 'tree:update', tree: this.buildTree(), files: this.fileList });
    });

    bus.typedOn('file:changed', ({ path, content }) => {
      this.contentIndex.set(path, content);
    });

    bus.typedOn('file:added', async ({ path }) => {
      if (this.fileList.find((f) => f.absolutePath === path)) return;
      try {
        const content = await readFile(path, 'utf-8');
        this.fileList.push({
          name: basename(path),
          relativePath: this.rootDir ? relative(this.rootDir, path) : basename(path),
          absolutePath: path,
        });
        this.fileList.sort((a, b) => a.relativePath.localeCompare(b.relativePath));
        this.contentIndex.set(path, content);
        bus.typedEmit('file:changed', { path, content });
        this.broadcast({ type: 'tree:update', tree: this.buildTree(), files: this.fileList });
      } catch {
        /* 읽기 실패 시 무시 */
      }
    });

    bus.typedOn('file:removed', ({ path }) => {
      this.fileList = this.fileList.filter((f) => f.absolutePath !== path);
      this.contentIndex.delete(path);
      this.renders.delete(path);
      this.wordCounts.delete(path);
      for (const files of this.backlinksIndex.values()) files.delete(path);
      for (const files of this.tagsIndex.values()) {
        files.delete(path);
        if (files.size === 0) this.tagsIndex.delete(path);
      }
      this.broadcast({ type: 'tree:update', tree: this.buildTree(), files: this.fileList });
    });

    bus.typedOn('render:done', ({ html, path, toc, frontmatter, tags, wordCount, wikiLinks }) => {
      this.renders.set(path, { html, toc, frontmatter: frontmatter as Record<string, unknown> });
      this.wordCounts.set(path, wordCount);

      for (const [tag, files] of this.tagsIndex) {
        files.delete(path);
        if (files.size === 0) this.tagsIndex.delete(tag);
      }
      for (const tag of tags) {
        if (!this.tagsIndex.has(tag)) this.tagsIndex.set(tag, new Set());
        this.tagsIndex.get(tag)!.add(path);
      }

      for (const targets of this.backlinksIndex.values()) {
        targets.delete(path);
      }
      for (const linkName of wikiLinks) {
        const target = this.findFileByName(linkName);
        if (target) {
          if (!this.backlinksIndex.has(target)) this.backlinksIndex.set(target, new Set());
          this.backlinksIndex.get(target)!.add(path);
        }
      }

      this.broadcast({ type: 'update', path, html, toc, frontmatter });
    });

    bus.typedOn('render:error', ({ error, path }) => {
      this.broadcast({ type: 'error', path, message: error.message });
    });

    await this.tryListen();
  }

  private findFileByName(name: string): string | null {
    const nameWithExt = name.toLowerCase().endsWith('.md') ? name.toLowerCase() : name.toLowerCase() + '.md';
    const entry = this.fileList.find(f =>
      f.name.toLowerCase() === nameWithExt ||
      f.relativePath.toLowerCase() === nameWithExt ||
      f.relativePath.toLowerCase().endsWith('/' + nameWithExt)
    );
    return entry?.absolutePath ?? null;
  }

  private isSafePath(abs: string): boolean {
    if (!this.rootDir) return true;
    return abs.startsWith(this.rootDir + sep) || abs === this.rootDir;
  }

  private resolveDisplayPath(queryFile?: string): string {
    if (queryFile) {
      const abs = resolve(this.rootDir, queryFile);
      if (this.renders.has(abs)) return abs;
    }
    return this.renders.keys().next().value ?? '';
  }

  private buildTree(): TreeNode {
    const root: TreeNode = { name: '', path: '', absPath: this.rootDir, type: 'dir', children: [] };

    for (const f of this.fileList) {
      const rel = f.relativePath.replace(/\\/g, '/');
      const parts = rel.split('/');
      let node = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const dirName = parts[i];
        let dir = node.children.find((c) => c.type === 'dir' && c.name === dirName);
        if (!dir) {
          dir = { name: dirName, path: parts.slice(0, i + 1).join('/'), absPath: join(this.rootDir, ...parts.slice(0, i + 1)), type: 'dir', children: [] };
          node.children.push(dir);
        }
        node = dir;
      }
      node.children.push({ name: f.name, path: f.relativePath, absPath: f.absolutePath, type: 'file', children: [] });
    }

    const sort = (n: TreeNode): void => {
      n.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      n.children.filter((c) => c.type === 'dir').forEach(sort);
    };
    sort(root);
    return root;
  }

  private async tryListen(): Promise<void> {
    let port = this.port;
    for (let attempt = 0; attempt < 10; attempt++) {
      try {
        await this.app.listen({ port, host: '127.0.0.1' });
        bus.typedEmit('server:ready', { port, url: `http://localhost:${port}` });
        return;
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EADDRINUSE') {
          port++;
        } else {
          throw err;
        }
      }
    }
    throw new Error('사용 가능한 포트를 찾을 수 없습니다 (3000–3009)');
  }

  private broadcast(msg: object): void {
    const data = JSON.stringify(msg);
    for (const ws of this.clients) {
      if (ws.readyState === 1) ws.send(data);
    }
  }

  async stop(): Promise<void> {
    for (const ws of this.clients) ws.close();
    await this.app.close();
  }
}
