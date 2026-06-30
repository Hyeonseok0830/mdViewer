# mdViewer — Agent Pipeline & Harness Design

## 1. 프로젝트 개요

로컬 `.md` 파일을 브라우저에서 실시간으로 렌더링하는 뷰어 툴.
핵심 요구: 파일 선택 → 파싱 → 렌더링 → 실시간 파일 감시(변경 시 자동 새로고침).

---

## 2. 하네스 파이프라인 전체 구조

```
[사용자 입력]
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│                    CLI Entry (bin/mdviewer)              │
│   옵션 파싱: --port, --open, --theme, <file/dir>         │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
   [FileAgent]    [ServerAgent]   [WatchAgent]
   파일 로드/     HTTP + WS      파일 변경
   경로 검증      서버 기동      감시 (fs.watch)
          │              │              │
          └──────────────┼──────────────┘
                         ▼
               [RenderAgent]
               Markdown → HTML
               (파서 + 플러그인)
                         │
                         ▼
               [BrowserAgent]
               클라이언트 JS
               WS 연결 + DOM 업데이트
```

---

## 3. 에이전트 명세

### 3.1 FileAgent

**역할**: 입력 경로를 받아 읽을 수 있는 `.md` 파일 목록을 확정하고 내용을 제공.

| 항목 | 내용 |
|------|------|
| 입력 | CLI 인수 (파일 경로 또는 디렉토리 경로) |
| 출력 | `{ path: string, content: string, mtime: Date }[]` |
| 책임 | 경로 검증, 확장자 필터, 파일 읽기, 에러 정형화 |
| 에러 처리 | 존재하지 않는 경로 → stderr 출력 후 프로세스 종료 |

**파이프라인 이벤트**:
```
INIT  → path:resolve → path:validate → file:read → READY
ERROR → file:not-found | file:no-permission
```

---

### 3.2 WatchAgent

**역할**: 파일 시스템 변경을 감지하여 RenderAgent에 재렌더링 신호를 보냄.

| 항목 | 내용 |
|------|------|
| 입력 | FileAgent의 감시 대상 경로 목록 |
| 출력 | `file:changed` 이벤트 (변경된 파일 경로 포함) |
| 책임 | `fs.watch` / `chokidar` 래핑, debounce (150ms), 중복 이벤트 제거 |
| 에러 처리 | 감시 대상 삭제 시 graceful 해제 |

**파이프라인 이벤트**:
```
INIT  → watch:start
RUN   → file:changed(path) → [RenderAgent] → [ServerAgent:push]
STOP  → watch:close
```

---

### 3.3 RenderAgent

**역할**: Markdown 원문을 HTML 문자열로 변환. 플러그인 체인 실행.

| 항목 | 내용 |
|------|------|
| 입력 | `{ path, content }` |
| 출력 | `{ html: string, toc: TocItem[], frontmatter: object }` |
| 책임 | 파서 초기화, 플러그인 순서 적용, XSS 방어(sanitize), TOC 추출 |
| 플러그인 체인 | `frontmatter` → `GFM` → `syntax-highlight` → `math(KaTeX)` → `mermaid` → `link-rewrite` → `sanitize` |
| 에러 처리 | 파싱 실패 시 원문(plain text) 폴백 |

**파이프라인 이벤트**:
```
file:changed → render:start → [plugin chain] → render:done(html)
render:error → render:fallback(plaintext)
```

---

### 3.4 ServerAgent

**역할**: HTTP 서버와 WebSocket 서버를 함께 운용. 렌더링 결과를 브라우저에 전달.

| 항목 | 내용 |
|------|------|
| 입력 | RenderAgent 출력, 포트 설정 |
| 출력 | HTTP 응답 (초기 HTML), WS 메시지 (업데이트 diff) |
| 책임 | 정적 에셋 서빙, WS 연결 관리, 초기 HTML 조립, 변경분 push |
| 경로 규칙 | `GET /` → 뷰어 셸, `GET /api/render?file=` → JSON, `WS /ws` → 실시간 채널 |
| 에러 처리 | 포트 충돌 → 다음 포트 자동 탐색 (+1, 최대 10회) |

**파이프라인 이벤트**:
```
INIT       → server:listen(port)
render:done → server:push(ws, { type:'update', html, toc })
SIGTERM    → server:close
```

---

### 3.5 BrowserAgent (클라이언트 JS)

**역할**: 브라우저 내에서 WS를 구독하고 DOM을 업데이트.

| 항목 | 내용 |
|------|------|
| 입력 | WS 메시지 `{ type, html, toc }` |
| 출력 | DOM 변경, 스크롤 위치 복원, TOC 하이라이트 |
| 책임 | WS 재연결(지수 백오프), 스크롤 복원, 테마 토글, 인쇄 지원 |
| 에러 처리 | WS 끊김 → 재연결 배너 표시, 3회 실패 시 페이지 폴링으로 폴백 |

---

## 4. 이벤트 버스 (Agent 간 통신)

모든 에이전트는 중앙 `EventBus`(Node.js `EventEmitter` 확장)를 통해 통신.
직접 참조 없이 이벤트 이름으로만 결합 → 에이전트 교체 가능.

```
EventBus 이벤트 목록
─────────────────────────────────────────
file:ready          FileAgent  → 모두
file:changed        WatchAgent → RenderAgent
render:done         RenderAgent → ServerAgent
server:push         ServerAgent → (내부 WS)
server:ready        ServerAgent → CLI(open browser)
app:shutdown        CLI        → 모두
```

---

## 5. 디렉토리 구조 (목표 상태)

```
08.mdViewer/
├── agents.md                  ← 이 파일 (설계 문서)
├── package.json
├── tsconfig.json
├── bin/
│   └── mdviewer.ts            ← CLI 진입점
├── src/
│   ├── bus.ts                 ← EventBus
│   ├── agents/
│   │   ├── FileAgent.ts
│   │   ├── WatchAgent.ts
│   │   ├── RenderAgent.ts
│   │   └── ServerAgent.ts
│   ├── render/
│   │   ├── parser.ts          ← marked / unified 설정
│   │   ├── plugins/
│   │   │   ├── frontmatter.ts
│   │   │   ├── highlight.ts   ← shiki or highlight.js
│   │   │   ├── math.ts        ← KaTeX
│   │   │   ├── mermaid.ts
│   │   │   └── sanitize.ts    ← DOMPurify (server-side)
│   │   └── toc.ts
│   └── server/
│       ├── http.ts
│       ├── ws.ts
│       └── static/
│           ├── index.html     ← 뷰어 셸
│           ├── client.ts      ← BrowserAgent
│           └── styles/
│               ├── base.css
│               ├── theme-light.css
│               └── theme-dark.css
└── tests/
    ├── FileAgent.test.ts
    ├── RenderAgent.test.ts
    └── WatchAgent.test.ts
```

---

## 6. 기술 스택 선택

| 레이어 | 선택 | 이유 |
|--------|------|------|
| 런타임 | Node.js 20+ | 네이티브 `fs.watch`, ESM 지원 |
| 언어 | TypeScript 5 | 타입 안전성, 에이전트 인터페이스 명확화 |
| Markdown 파서 | `unified` + `remark` + `rehype` | 플러그인 생태계, AST 접근 |
| 문법 강조 | `shiki` | 정확한 토큰 기반, SSR 친화적 |
| 수식 | `katex` (server-side) | 빌드 시 렌더링, 브라우저 의존성 제거 |
| 다이어그램 | `mermaid` (lazy client) | 서버 렌더링 불안정 → 클라이언트 지연 로드 |
| HTTP/WS 서버 | `fastify` + `@fastify/websocket` | 경량, 타입 지원 |
| 파일 감시 | `chokidar` | cross-platform, debounce 내장 |
| 번들러(클라이언트) | `esbuild` | 속도, zero-config |
| 테스트 | `vitest` | ESM 네이티브, TS 즉시 지원 |

---

## 7. 구현 순서 (페이즈)

```
Phase 1 — 뼈대
  ① EventBus 구현
  ② FileAgent (읽기 + 검증)
  ③ RenderAgent (기본 GFM만)
  ④ ServerAgent (HTTP + WS 최소)
  ⑤ BrowserAgent (WS 수신 + innerHTML)

Phase 2 — 실시간
  ⑥ WatchAgent (chokidar + debounce)
  ⑦ 스크롤 위치 복원 로직

Phase 3 — 렌더링 품질
  ⑧ 문법 강조 (shiki)
  ⑨ 수식 (KaTeX)
  ⑩ Mermaid (클라이언트 지연 로드)
  ⑪ frontmatter 파싱 + 표시

Phase 4 — UX
  ⑫ TOC 사이드바
  ⑬ 다크/라이트 테마
  ⑭ 인쇄 스타일
  ⑮ 디렉토리 모드 (파일 목록 네비게이션)

Phase 5 — 품질
  ⑯ 유닛 테스트 (vitest)
  ⑰ CLI 옵션 완성 (--port, --no-open, --theme)
  ⑱ npm 패키지 배포 준비 (bin 등록)
```

---

## 8. 에이전트 인터페이스 계약 (TypeScript)

```typescript
// 모든 에이전트가 구현해야 하는 공통 인터페이스
interface Agent {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}

// EventBus 이벤트 타입 맵
interface BusEvents {
  'file:ready':   { path: string; content: string; mtime: Date }[];
  'file:changed': { path: string; content: string };
  'render:done':  { path: string; html: string; toc: TocItem[]; frontmatter: Record<string, unknown> };
  'render:error': { path: string; error: Error };
  'server:ready': { port: number; url: string };
  'app:shutdown': void;
}

interface TocItem {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
  id: string;
  children: TocItem[];
}
```

---

## 9. 보안 고려사항

| 위협 | 대응 |
|------|------|
| XSS (마크다운 내 `<script>`) | `rehype-sanitize` — 허용 태그 화이트리스트 |
| 경로 탐색 (path traversal) | FileAgent에서 `path.resolve` + 허용 루트 바운더리 검사 |
| 임의 파일 노출 | API는 초기 지정 경로 트리만 서빙 |
| WS 무제한 연결 | 연결 수 상한 (기본 32) |

---

*이 문서는 구현 전 설계 기준점입니다. 각 Phase 완료 후 실제 코드와 비교하여 업데이트합니다.*
