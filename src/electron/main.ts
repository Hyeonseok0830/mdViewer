import { app, BrowserWindow, dialog, Menu, shell, nativeImage, type NativeImage } from 'electron';
import { stat } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, join, relative } from 'node:path';
import { ICON_PNG_512_B64 } from './icon-data.js';
import { fileURLToPath } from 'node:url';
import { bus } from '../bus.js';
import { FileAgent } from '../agents/FileAgent.js';
import { WatchAgent } from '../agents/WatchAgent.js';
import { RenderAgent } from '../agents/RenderAgent.js';
import { ServerAgent } from '../agents/ServerAgent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
let watchAgent: WatchAgent | null = null;
let serverAgent: ServerAgent | null = null;

function getKatexPath(): string {
  if (!app.isPackaged) {
    return join(__dirname, '../../../node_modules/katex/dist');
  }
  const asarUnpacked = join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'katex', 'dist');
  if (existsSync(asarUnpacked)) return asarUnpacked;
  return join(process.resourcesPath, 'app', 'node_modules', 'katex', 'dist');
}

function getVendorPath(): string {
  if (!app.isPackaged) {
    return join(__dirname, '../../../assets/vendor');
  }
  const asarUnpacked = join(process.resourcesPath, 'app.asar.unpacked', 'assets', 'vendor');
  if (existsSync(asarUnpacked)) return asarUnpacked;
  return join(process.resourcesPath, 'app', 'assets', 'vendor');
}

// ── 창 생성 ─────────────────────────────────────────────────
function createAppIcon(): NativeImage {
  // PNG를 base64로 소스에 임베드 → 파일 시스템 경로 의존 없음
  return nativeImage.createFromDataURL('data:image/png;base64,' + ICON_PNG_512_B64);
}

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 700,
    minHeight: 500,
    title: 'MdPad',
    icon: createAppIcon(),
    show: false,
    backgroundColor: '#0d1117',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  win.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
    <!DOCTYPE html><html>
    <head><meta charset="UTF-8">
    <style>
      body{margin:0;background:#0d1117;color:#8b949e;display:flex;
           align-items:center;justify-content:center;height:100vh;
           font-family:system-ui,sans-serif;font-size:15px;flex-direction:column;gap:12px}
      .dots{display:flex;gap:6px}
      .dot{width:8px;height:8px;border-radius:50%;background:#58a6ff;
           animation:pulse 1.2s infinite}
      .dot:nth-child(2){animation-delay:.2s}.dot:nth-child(3){animation-delay:.4s}
      @keyframes pulse{0%,80%,100%{opacity:.2}40%{opacity:1}}
    </style></head>
    <body><div class="dots">
      <div class="dot"></div><div class="dot"></div><div class="dot"></div>
    </div><span>초기화 중...</span></body></html>
  `));

  win.once('ready-to-show', () => win.show());
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  return win;
}

// ── 메뉴 ────────────────────────────────────────────────────
function buildMenu(): void {
  const { version } = JSON.parse(
    readFileSync(join(app.getAppPath(), 'package.json'), 'utf-8')
  ) as { version: string };

  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'MdPad',
      submenu: [
        { label: '파일 열기...', accelerator: 'CmdOrCtrl+O', click: () => openFileDialog() },
        { label: '폴더 열기...', accelerator: 'CmdOrCtrl+Shift+O', click: () => openFolderDialog() },
        { type: 'separator' },
        { role: 'quit', label: '종료' },
      ],
    },
    {
      label: '보기',
      submenu: [
        { role: 'reload', label: '새로고침' },
        { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'toggleDevTools', label: '개발자 도구' },
      ],
    },
    {
      label: '도움말',
      submenu: [
        {
          label: 'MdPad 정보',
          click: () => showAboutDialog(version),
        },
        { type: 'separator' },
        {
          label: '단축키',
          click: () => showShortcutsDialog(),
        },
        { type: 'separator' },
        {
          label: 'GitHub 저장소',
          click: () => shell.openExternal('https://github.com'),
        },
        {
          label: '문제 신고',
          click: () => shell.openExternal('https://github.com'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function showAboutDialog(version: string): void {
  const { versions } = process;
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: 'MdPad 정보',
    icon: undefined,
    message: 'MdPad',
    detail: [
      `버전: ${version}`,
      '',
      '로컬 마크다운 파일 실시간 뷰어/편집기',
      '',
      `Electron: ${versions.electron}`,
      `Node.js: ${versions.node}`,
      `Chromium: ${versions.chrome}`,
      '',
      '주요 라이브러리',
      '  • Fastify — HTTP/WebSocket 서버',
      '  • shiki — 구문 강조',
      '  • KaTeX — 수식 렌더링',
      '  • Mermaid — 다이어그램',
      '  • unified/remark/rehype — Markdown 파이프라인',
    ].join('\n'),
    buttons: ['확인'],
  });
}

function showShortcutsDialog(): void {
  dialog.showMessageBox(mainWindow!, {
    type: 'info',
    title: '단축키',
    message: '단축키 목록',
    detail: [
      'V            미리보기 모드',
      'S            분할 편집 모드',
      'E            전체 편집 모드',
      'Ctrl+S       파일 저장',
      'Ctrl+O       파일 열기',
      'Ctrl+Shift+O 폴더 열기',
      'Ctrl++       확대',
      'Ctrl+-       축소',
      'F11          전체화면',
      'F12          개발자 도구',
    ].join('\n'),
    buttons: ['닫기'],
  });
}

// ── 서버 시작 ────────────────────────────────────────────────
async function startServer(inputPath: string): Promise<void> {
  const s = await stat(inputPath);
  const isDir = s.isDirectory();
  const rootDir = isDir ? inputPath : dirname(inputPath);
  // 파일을 직접 선택한 경우에도 부모 폴더를 기준으로 탐색 (Obsidian 스타일)
  const initialFile = !isDir ? relative(rootDir, inputPath).replace(/\\/g, '/') : '';

  const fileAgent = new FileAgent(rootDir);
  watchAgent = new WatchAgent(rootDir);
  const renderAgent = new RenderAgent();
  serverAgent = new ServerAgent(3000, rootDir, true, getKatexPath(), getVendorPath());
  serverAgent.setRenderAgent(renderAgent);

  bus.typedOn('server:ready', ({ url }) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const target = initialFile ? `${url}/?file=${encodeURIComponent(initialFile)}` : url;
      mainWindow.loadURL(target);
      mainWindow.setTitle(`MdPad — ${inputPath.split(/[/\\]/).pop()}`);
    }
  });

  try {
    await renderAgent.start();
    await serverAgent.start();
    await fileAgent.start();
    await watchAgent.start();
  } catch (err) {
    showError(err as Error);
  }
}

function showError(err: Error): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <style>body{margin:40px;font-family:system-ui;background:#0d1117;color:#f85149}
      pre{background:#161b22;padding:16px;border-radius:8px;color:#e6edf3;overflow:auto}</style></head>
      <body><h2>시작 오류</h2><pre>${err.stack ?? err.message}</pre></body></html>
    `));
  }
}

// ── 파일/폴더 열기 다이얼로그 ────────────────────────────────
async function openFileDialog(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '마크다운 파일 선택',
    properties: ['openFile'],
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }, { name: '모든 파일', extensions: ['*'] }],
  });
  if (!result.canceled && result.filePaths[0]) await relaunchWith(result.filePaths[0]);
}

async function openFolderDialog(): Promise<void> {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '마크다운 폴더 선택',
    properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths[0]) await relaunchWith(result.filePaths[0]);
}

async function relaunchWith(inputPath: string): Promise<void> {
  await watchAgent?.stop();
  await serverAgent?.stop();
  watchAgent = null;
  serverAgent = null;
  mainWindow?.loadURL('about:blank');
  await startServer(inputPath);
}

// ── 실행 인자에서 경로 추출 ─────────────────────────────────
async function getInputPathFromArgs(): Promise<string | null> {
  const args = app.isPackaged ? process.argv.slice(1) : process.argv.slice(2);
  for (const arg of args) {
    if (!arg || arg.startsWith('-')) continue;
    try { await stat(arg); return resolve(arg); } catch { /* skip */ }
  }
  return null;
}

// ── 앱 초기화 ────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    if (mainWindow) { if (mainWindow.isMinimized()) mainWindow.restore(); mainWindow.focus(); }
    const filePath = argv.find((a) => !a.startsWith('-') && /\.md$/i.test(a));
    if (filePath) relaunchWith(filePath).catch(console.error);
  });

  app.whenReady().then(async () => {
    buildMenu();
    mainWindow = createWindow();

    let inputPath = await getInputPathFromArgs();

    if (!inputPath) {
      const result = await dialog.showOpenDialog({
        title: '마크다운 파일 또는 폴더 선택',
        properties: ['openFile', 'openDirectory'],
        filters: [{ name: 'Markdown', extensions: ['md', 'markdown'] }, { name: '모든 파일', extensions: ['*'] }],
      });
      if (result.canceled || !result.filePaths[0]) { app.quit(); return; }
      inputPath = result.filePaths[0];
    }

    await startServer(inputPath);
  });

  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow(); });
  app.on('before-quit', async () => { await Promise.all([watchAgent?.stop(), serverAgent?.stop()]); });
  app.on('open-file', (event, path) => {
    event.preventDefault();
    if (app.isReady()) relaunchWith(path).catch(console.error);
    else app.whenReady().then(() => relaunchWith(path));
  });
}
