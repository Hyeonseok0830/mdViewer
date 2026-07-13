# Changelog

## v3.2.0

### 🗂 Vault Management / 볼트 관리

**EN**
- **Link-safe renames** — renaming a note rewrites every `[[wiki link]]` (aliases and `![[embeds]]` included) across the vault
- **File management**: drag & drop notes between folders; create/rename/delete folders via folder context menu
- **Outgoing links panel** in the sidebar (unresolved targets shown, click to create)
- **Templates** — `templates/` folder + command-palette insert with `{{date}}` `{{time}}` `{{title}}`
- **Slash commands** — type `/` in the editor for headings, checkboxes, tables, callouts, code blocks and more
- **Image paste** — clipboard images saved to `attachments/` and auto-linked; vault images now served in preview
- Empty folders appear in the file explorer

**KO**
- **링크가 깨지지 않는 이름 변경** — 노트 이름 변경 시 볼트 전체의 `[[위키링크]]`(별칭·`![[임베드]]` 포함) 자동 재작성
- **파일 관리**: 드래그&드롭 폴더 간 이동, 폴더 우클릭 메뉴로 생성/이름변경/삭제
- **아웃고잉 링크 패널** — 사이드바에 참조 노트 표시 (미생성 노트 포함, 클릭 시 생성)
- **템플릿** — `templates/` 폴더 + 명령 팔레트 삽입, `{{date}}` `{{time}}` `{{title}}` 변수
- **슬래시 명령** — 에디터에서 `/` 입력으로 제목·체크박스·표·콜아웃·코드 블록 등 삽입
- **이미지 붙여넣기** — 클립보드 이미지를 `attachments/`에 저장 후 자동 링크, 볼트 내 이미지 미리보기 서빙
- 빈 폴더도 파일 탐색기에 표시

---

## v3.1.0

### ⚡ Obsidian-grade Features / 옵시디언 핵심 기능

**EN**
- **Clickable task checkboxes** in preview — changes are written back to the `.md` file (code blocks skipped)
- **Note auto-creation from wiki links** — clicking a `[[link]]` to a missing note creates and opens it; unresolved links render dimmed
- **Command palette** (`Ctrl+Shift+P`) with daily note, random note, mode switching, theme, print and more
- **Daily note** command creates/opens today's `YYYY-MM-DD.md`
- **Smart editor**: auto-continue lists/checkboxes/quotes on `Enter`, `Ctrl+B`/`Ctrl+I` bold/italic, `Ctrl+K` link, `Ctrl+Enter` checkbox toggle
- **Navigation history**: `Alt+←` / `Alt+→`
- **Nested note creation** (`folder/sub/note`) with automatic folder creation; wiki links resolve by file name anywhere in the vault
- Fixed `v`/`s`/`e` switching modes while typing in inputs

**KO**
- **미리보기 체크박스 클릭 반영** — `.md` 파일에 즉시 저장 (코드 블록 안은 무시)
- **위키링크 노트 자동 생성** — 없는 노트의 `[[링크]]` 클릭 시 생성 후 열기, 미해결 링크는 흐리게 표시
- **명령 팔레트** (`Ctrl+Shift+P`) — 데일리 노트·랜덤 노트·모드 전환·테마·인쇄 등
- **데일리 노트** 명령으로 오늘 날짜(`YYYY-MM-DD.md`) 노트 생성/열기
- **스마트 에디터**: `Enter` 리스트·체크박스·인용 자동 이어쓰기, `Ctrl+B`/`Ctrl+I` 서식, `Ctrl+K` 링크, `Ctrl+Enter` 체크박스 토글
- **탐색 히스토리**: `Alt+←` / `Alt+→`
- **하위 폴더 노트 생성** (`폴더/하위/노트`) + 중간 폴더 자동 생성, 위키링크 파일명 기반 해석
- 입력 필드에서 `v`/`s`/`e` 입력 시 모드가 전환되던 문제 수정

---

## v3.0.0

### 🚀 Major Release / 메이저 릴리즈

**EN**
- Consolidates the Obsidian-style UI overhaul (v2.0.9) into a clean major release
- **Fixed `Esc` closing the app window** — Electron now intercepts `Esc` and only the topmost overlay (graph view, search, quick switcher, theme picker, rename, autocomplete) is closed
- **macOS DMG now built for both Intel (x64) and Apple Silicon (arm64)** — previously arm64 only
- **Release pages now include proper bilingual release notes** (auto-attached by CI from `.github/RELEASE_NOTES.md`)
- Unified in-app branding to **MdPad** (window title previously showed "mdViewer")
- README fully rewritten: download table, current feature list (wiki links, backlinks, graph view, callouts, quick switcher, full-text search, 6 themes)

**KO**
- 옵시디언 스타일 UI 개편(v2.0.9)을 정리한 메이저 릴리즈
- **`Esc` 키가 앱 창을 닫던 버그 수정** — Electron이 `Esc`를 가로채 최상위 오버레이(그래프 뷰·검색·퀵 스위처·테마 피커·이름변경·자동완성)만 닫도록 변경
- **macOS DMG를 인텔(x64)·애플 실리콘(arm64) 둘 다 빌드** — 기존엔 arm64만 제공
- **릴리즈 페이지에 영/한 릴리즈 노트 자동 첨부** (CI가 `.github/RELEASE_NOTES.md`를 본문으로 사용)
- 앱 내 표기를 **MdPad**로 통일 (창 제목이 "mdViewer"로 표시되던 문제)
- README 전면 개편: 다운로드 표, 최신 기능 목록(위키링크·백링크·그래프 뷰·콜아웃·퀵 스위처·전체 검색·6개 테마) 반영

---

## v2.0.9

### ✨ Obsidian-style UI Overhaul / 옵시디언 스타일 UI 개편

**EN**
- **New default Light/Dark themes** modeled after Obsidian (pure white / `#1e1e1e` charcoal); the previous dark palette lives on as a separate **Mocha** theme — 6 themes total
- **Inline note title**: the file name is shown as a large title at the top of each note (auto-hidden when the note already starts with an identical `# heading`)
- **File explorer polish**: rounded hover pills, accent-tinted active file, vertical indent guides for nested folders
- **Typography refresh**: Obsidian-like heading scale (no underline borders), underlined links, custom rounded checkboxes with strike-through on completed tasks, accent-colored blockquote bar, cleaner tables
- **Resizable sidebar**: drag the sidebar edge to resize (double-click to reset); width is remembered
- Segmented-control mode switcher, thin rounded scrollbars, refreshed welcome screen with keyboard-shortcut hints

**KO**
- **새 기본 라이트/다크 테마**를 옵시디언 톤으로 교체 (순백 / `#1e1e1e` 차콜) — 기존 다크 팔레트는 **모카** 테마로 유지, 총 6개 테마
- **인라인 노트 제목**: 노트 상단에 파일명을 큰 제목으로 표시 (본문이 같은 제목의 `#` 헤딩으로 시작하면 자동 숨김)
- **파일 탐색기 개선**: 둥근 hover 하이라이트, 강조색 활성 파일 표시, 중첩 폴더 들여쓰기 가이드라인
- **타이포그래피 개편**: 옵시디언식 헤딩 크기(밑줄 경계선 제거), 링크 밑줄, 커스텀 둥근 체크박스 + 완료 항목 취소선, 강조색 인용문 바, 깔끔해진 표
- **사이드바 크기 조절**: 가장자리를 드래그해 너비 조절 (더블클릭으로 초기화), 너비 자동 저장
- 세그먼트형 모드 전환 버튼, 얇고 둥근 스크롤바, 단축키 안내가 포함된 새 웰컴 화면

---

## v2.0.5 – v2.0.6

### 🎨 Theme Picker / 테마 선택기

**EN**
- Added a **Theme** button in the header bar (previously a barely-visible `◑` icon, now a labeled button)
- Click **Theme** to open a floating picker with 5 themes: **Light**, **Mocha** (dark), **Material**, **Solarized**, **Nord**
- Each card shows a color swatch preview; your choice is saved and restored on next launch

**KO**
- 헤더 우측에 **테마** 버튼 추가 (기존 `◑` 아이콘 → 텍스트 레이블로 개선)
- 클릭하면 5가지 테마를 카드 미리보기로 선택 가능: **라이트**, **모카**, **머테리얼**, **솔라라이즈드**, **노드**
- 선택한 테마는 앱 재시작 후에도 유지

---

### 🔄 Real-time Folder Sync / 실시간 폴더 동기화

**EN**
- The file explorer now **automatically updates** when files are added or deleted in the watched folder — no refresh needed
- A manual **⟳** button is also available next to the file list header as a fallback

**KO**
- 감시 중인 폴더에 파일이 추가되거나 삭제되면 파일 탐색기가 **자동으로 동기화** (WebSocket 실시간)
- 파일 목록 헤더 옆 **⟳** 버튼으로 수동 새로고침도 가능

---

### 🐛 Bug Fixes / 버그 수정

**EN**
- Fixed startup folder picker appearing behind the main window on launch
- Fixed a JavaScript syntax error that caused the file explorer to appear empty

**KO**
- 앱 시작 시 폴더 선택 창이 메인 창 뒤로 숨는 문제 수정
- JS 구문 오류로 파일 탐색기가 빈 상태로 표시되던 문제 수정
