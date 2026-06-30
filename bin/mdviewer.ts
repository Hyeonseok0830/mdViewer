#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { exec } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { bus } from '../src/bus.js';
import { FileAgent } from '../src/agents/FileAgent.js';
import { WatchAgent } from '../src/agents/WatchAgent.js';
import { RenderAgent } from '../src/agents/RenderAgent.js';
import { ServerAgent } from '../src/agents/ServerAgent.js';

const { values, positionals } = parseArgs({
  args: process.argv.slice(2),
  options: {
    port:      { type: 'string',  short: 'p', default: '3000' },
    'no-open': { type: 'boolean', default: false },
  },
  allowPositionals: true,
});

if (positionals.length === 0) {
  process.stderr.write(
    'mdViewer — 마크다운 파일 실시간 뷰어\n\n' +
    '사용법: mdviewer [옵션] <파일.md | 디렉토리>\n\n' +
    '옵션:\n' +
    '  -p, --port <포트>  HTTP 포트 (기본값: 3000)\n' +
    '  --no-open          브라우저 자동 열기 비활성화\n',
  );
  process.exit(1);
}

const port        = parseInt(values.port ?? '3000', 10);
const inputPath   = positionals[0];

async function main(): Promise<void> {
  const resolvedPath = resolve(inputPath);

  let isDir = false;
  try {
    const s = await stat(resolvedPath);
    isDir = s.isDirectory();
  } catch {
    process.stderr.write(`경로를 찾을 수 없습니다: ${inputPath}\n`);
    process.exit(1);
  }

  const rootDir = isDir ? resolvedPath : dirname(resolvedPath);

  const fileAgent   = new FileAgent(resolvedPath);
  const watchAgent  = new WatchAgent(resolvedPath);
  const renderAgent = new RenderAgent();
  const serverAgent = new ServerAgent(port, rootDir, isDir);
  serverAgent.setRenderAgent(renderAgent);

  bus.typedOn('server:ready', ({ url }) => {
    process.stdout.write(`\n  mdViewer 실행 중 → ${url}\n\n`);
    if (!values['no-open']) openBrowser(url);
  });

  await renderAgent.start();
  await serverAgent.start();
  await fileAgent.start();
  await watchAgent.start();

  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, async () => {
      bus.typedEmit('app:shutdown', undefined);
      await Promise.all([watchAgent.stop(), serverAgent.stop()]);
      process.exit(0);
    });
  }
}

function openBrowser(url: string): void {
  const cmd =
    process.platform === 'darwin' ? `open "${url}"` :
    process.platform === 'win32'  ? `start "" "${url}"` :
                                    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) process.stderr.write(`브라우저 열기 실패: ${err.message}\n`);
  });
}

main().catch((err: Error) => {
  process.stderr.write(`오류: ${err.message}\n`);
  process.exit(1);
});
