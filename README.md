# MdPad

로컬 마크다운 파일을 실시간으로 렌더링하는 뷰어/편집기 데스크탑 앱입니다.

![MdPad](assets/icon.svg)

## 기능

- **실시간 미리보기** — 파일 저장 즉시 자동 갱신 (WebSocket)
- **구문 강조** — shiki 기반, GitHub 라이트/다크 이중 테마, 80여 개 언어
- **수식 렌더링** — KaTeX (인라인 `$...$`, 블록 `$$...$$`)
- **다이어그램** — Mermaid (플로우차트, 시퀀스, 간트, 상태 다이어그램)
- **폴더 탐색기** — 사이드바 파일 트리, 클릭으로 파일 전환, on-demand 렌더링
- **내장 편집기** — 분할 보기(편집+미리보기), Ctrl+S 저장, 실시간 미리보기
- **목차(TOC)** — 헤딩 자동 추출, 클릭 이동, IntersectionObserver 활성 항목 추적
- **Frontmatter** — YAML 파싱 및 카드 표시
- **GitHub Flavored Markdown** — 표, 체크리스트, 취소선 등

## 단축키

| 키 | 동작 |
|---|---|
| `V` | 미리보기 모드 |
| `S` | 분할 편집 모드 |
| `E` | 전체 편집 모드 |
| `Ctrl+S` | 저장 |
| `Ctrl+O` | 파일 열기 |
| `Ctrl+Shift+O` | 폴더 열기 |

## 시작하기

### 개발 환경 (CLI)

```bash
npm install
npm run dev -- sample/README.md        # 파일
npm run dev -- sample/                 # 폴더
```

### Electron 앱

```bash
npm run build
npm run electron:dev
```

### 배포용 빌드 (Windows)

```bash
# NSIS 인스톨러
npm run electron:build:nsis

# Microsoft Store용 APPX
npm run electron:build:appx
```

> **아이콘 생성**: Windows에서 `.\scripts\make-icon.ps1` 실행 (ImageMagick 필요)

## 아키텍처

5개의 에이전트가 중앙 EventBus를 통해 통신합니다.

```
FileAgent ──────┐
WatchAgent ─────┤──▶ EventBus ──▶ RenderAgent ──▶ ServerAgent ──▶ BrowserAgent
                │                                       │
                └───────────────────────────────────────┘
```

| 에이전트 | 역할 |
|---------|------|
| `FileAgent` | 파일/폴더 읽기, .md 파일 목록 수집 |
| `WatchAgent` | chokidar 파일 감시, 변경 감지 |
| `RenderAgent` | unified 파이프라인 (remark→rehype→shiki/KaTeX/Mermaid) |
| `ServerAgent` | Fastify HTTP + WebSocket 서버, REST API |
| `BrowserAgent` | 클라이언트 JS (WS 수신, 트리/TOC/에디터 렌더링) |

자세한 설계는 [agents.md](agents.md)를 참고하세요.

## 기술 스택

| 분류 | 라이브러리 |
|------|-----------|
| 런타임 | Node.js 20+, TypeScript 5 |
| 데스크탑 | Electron 41 |
| HTTP/WS | Fastify 5, @fastify/websocket |
| 마크다운 | unified, remark-parse, remark-rehype, remark-gfm |
| 구문 강조 | shiki 4 |
| 수식 | KaTeX (rehype-katex) |
| 다이어그램 | Mermaid 11 (CDN) |
| 파일 감시 | chokidar 3 |
| 패키징 | electron-builder |

## Microsoft Store 배포

[store/](store/) 폴더에 제출용 리소스가 준비되어 있습니다.

- [`store/description_ko.md`](store/description_ko.md) — 한국어 앱 설명
- [`store/description_en.md`](store/description_en.md) — 영어 앱 설명
- [`store/privacy_policy_ko.md`](store/privacy_policy_ko.md) — 개인정보 처리방침 (한국어)
- [`store/privacy_policy_en.md`](store/privacy_policy_en.md) — Privacy Policy (영어)
- [`store/store_assets.md`](store/store_assets.md) — Partner Center 제출 체크리스트

## 라이선스

[MIT](LICENSE)
