# MdPad 3.1.0

Obsidian-grade features release — interactive tasks, note auto-creation, command palette, daily notes and smarter editing.
옵시디언 핵심 기능을 대거 탑재한 기능 릴리즈입니다.

## ✨ New Features / 새 기능

**EN**
- **Clickable task checkboxes**: tick a checkbox in preview mode and the change is written straight back to the `.md` file (code blocks are safely skipped)
- **Note auto-creation from wiki links**: clicking a `[[link]]` to a note that doesn't exist creates it on the spot and opens it — unresolved links are shown dimmed, just like Obsidian
- **Command palette** (`Ctrl+Shift+P`): run any action from the keyboard — daily note, new note, graph view, search, mode switching, theme, print/PDF and more
- **Daily note**: one command creates/opens today's `YYYY-MM-DD.md`
- **Smart editor**: lists, checkboxes and quotes auto-continue on `Enter` (empty item removes the prefix), `Ctrl+B`/`Ctrl+I` bold/italic toggle, `Ctrl+K` link insert, `Ctrl+Enter` toggles the current line's checkbox
- **Navigation history**: `Alt+←` / `Alt+→` move back/forward between notes
- **Nested note creation**: `folder/sub/note` paths now work everywhere (new-file dialog, wiki links) — intermediate folders are created automatically
- **Wiki link resolution by name**: `[[note]]` finds the note anywhere in the vault, not just at the root

**KO**
- **체크박스 클릭 반영**: 미리보기에서 체크박스를 클릭하면 `.md` 파일에 즉시 저장 (코드 블록 안은 안전하게 무시)
- **위키링크 노트 자동 생성**: 존재하지 않는 노트의 `[[링크]]`를 클릭하면 그 자리에서 생성 후 열기 — 미해결 링크는 옵시디언처럼 흐리게 표시
- **명령 팔레트** (`Ctrl+Shift+P`): 데일리 노트·새 노트·그래프 뷰·검색·모드 전환·테마·인쇄 등 모든 동작을 키보드로 실행
- **데일리 노트**: 명령 한 번으로 오늘 날짜(`YYYY-MM-DD.md`) 노트 생성/열기
- **스마트 에디터**: `Enter`로 리스트·체크박스·인용 자동 이어쓰기 (빈 항목에선 프리픽스 제거), `Ctrl+B`/`Ctrl+I` 굵게/기울임 토글, `Ctrl+K` 링크 삽입, `Ctrl+Enter` 현재 줄 체크박스 토글
- **탐색 히스토리**: `Alt+←` / `Alt+→`로 노트 간 뒤로/앞으로 이동
- **하위 폴더 노트 생성**: `폴더/하위/노트` 경로 지원 (새 파일·위키링크 모두) — 중간 폴더 자동 생성
- **이름 기반 위키링크 해석**: `[[노트]]`가 볼트 어디에 있든 파일명으로 찾아 연결

## 🔧 Fixes / 수정

- Typing `v`/`s`/`e` inside search or file-name inputs no longer switches view modes / 검색·파일명 입력 중 `v`/`s`/`e` 입력 시 모드가 전환되던 문제 수정

## 📦 Downloads / 다운로드

| Platform | File |
|---|---|
| Windows (installer) | `MdPad.Setup.3.1.0.exe` |
| Windows (portable) | `MdPad.3.1.0.exe` |
| Windows (Store) | `MdPad.3.1.0.appx` / `.msix` |
| macOS (Apple Silicon) | `MdPad-3.1.0-arm64.dmg` |
| macOS (Intel) | `MdPad-3.1.0.dmg` |
| Linux | `MdPad-3.1.0.AppImage` / `mdpad_3.1.0_amd64.deb` |

Full changelog: [CHANGELOG.md](https://github.com/Hyeonseok0830/mdViewer/blob/main/CHANGELOG.md)
