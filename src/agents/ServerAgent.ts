import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebSocket from '@fastify/websocket';
import type { WebSocket } from 'ws';
import { resolve, relative, dirname, basename, sep, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { bus, type TocItem } from '../bus.js';
import { buildHtml } from '../server/template.js';
import type { RenderAgent } from './RenderAgent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_KATEX_DIST = resolve(__dirname, '../../node_modules/katex/dist');

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

  constructor(
    private port: number = 3000,
    private rootDir: string = '',
    private isDir: boolean = false,
    private katexPath: string = DEFAULT_KATEX_DIST,
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

    await this.app.register(fastifyWebSocket);

    // ── 초기 뷰어 페이지 ──────────────────────────────
    this.app.get('/', async (req, reply) => {
      await this.fileListReady;
      const queryFile = (req.query as Record<string, string>).file;
      // 디렉토리 모드에서 특정 파일 지정이 없으면 빈 상태로 시작
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
        } catch {
          return reply.code(404).send({ error: '파일을 찾을 수 없거나 렌더링 실패' });
        }
      }

      return {
        ...cached,
        relativePath: relative(this.rootDir, abs),
        absolutePath: abs,
        name: basename(abs),
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
      this.resolveFileList();
      // 이미 연결된 클라이언트에게 트리 업데이트 전송
      this.broadcast({ type: 'tree:update', tree: this.buildTree(), files: this.fileList });
    });

    bus.typedOn('render:done', ({ html, path, toc, frontmatter }) => {
      this.renders.set(path, { html, toc, frontmatter: frontmatter as Record<string, unknown> });
      this.broadcast({ type: 'update', path, html, toc, frontmatter });
    });

    bus.typedOn('render:error', ({ error, path }) => {
      this.broadcast({ type: 'error', path, message: error.message });
    });

    await this.tryListen();
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
