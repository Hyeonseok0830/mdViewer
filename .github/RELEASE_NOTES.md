# MdPad 3.0.0

Obsidian-inspired major release — a full UI overhaul on top of the existing agent-pipeline engine.
옵시디언에서 영감을 받은 메이저 릴리즈 — UI 전면 개편 버전입니다.

## ✨ Highlights

**EN**
- **Obsidian-style UI**: new default Light/Dark themes (pure white / `#1e1e1e` charcoal), 6 themes total including Mocha, Material, Solarized, Nord
- **Inline note title** at the top of each note, with duplicate-`# heading` auto-detection
- **File explorer polish**: rounded hover highlights, accent-tinted active file, indent guides for nested folders
- **Typography refresh**: Obsidian-like heading scale, underlined links, custom rounded checkboxes with strike-through on completed tasks, accent blockquote bar
- **Resizable sidebar** (drag to resize, double-click to reset, width remembered)
- Real-time folder sync, wiki links `[[...]]`, backlinks, graph view, callouts, tags, quick switcher (`Ctrl+P`), full-text search (`Ctrl+Shift+F`)

**KO**
- **옵시디언 스타일 UI**: 새 기본 라이트/다크 테마 (순백 / `#1e1e1e` 차콜), 모카·머테리얼·솔라라이즈드·노드 포함 총 6개 테마
- **인라인 노트 제목**: 노트 상단에 파일명을 큰 제목으로 표시, 같은 제목의 `#` 헤딩 중복 자동 감지
- **파일 탐색기 개선**: 둥근 hover 하이라이트, 강조색 활성 파일, 중첩 폴더 들여쓰기 가이드라인
- **타이포그래피 개편**: 옵시디언식 헤딩 크기, 링크 밑줄, 커스텀 둥근 체크박스 + 완료 항목 취소선, 강조색 인용문 바
- **사이드바 크기 조절** (드래그 조절 · 더블클릭 초기화 · 너비 저장)
- 실시간 폴더 동기화, 위키링크 `[[...]]`, 백링크, 그래프 뷰, 콜아웃, 태그, 퀵 스위처(`Ctrl+P`), 전체 검색(`Ctrl+Shift+F`)

## 🔧 Fixes / 수정

- Pressing `Esc` no longer closes the app window — it now only closes the topmost overlay (graph view, search, quick switcher, etc.) / `Esc` 키가 앱 창을 닫던 문제 수정 — 이제 최상위 오버레이(그래프 뷰·검색·퀵 스위처 등)만 닫습니다
- macOS DMG now ships for both Intel (x64) and Apple Silicon (arm64) / 맥 DMG가 인텔·애플 실리콘 둘 다 제공됩니다
- Unified in-app branding to **MdPad** / 앱 내 표기를 MdPad로 통일
- Release pages now include proper release notes / 릴리즈 페이지에 릴리즈 노트 자동 첨부

## 📦 Downloads / 다운로드

| Platform | File |
|---|---|
| Windows (installer) | `MdPad.Setup.3.0.0.exe` |
| Windows (portable) | `MdPad.3.0.0.exe` |
| Windows (Store) | `MdPad.3.0.0.appx` / `.msix` |
| macOS (Apple Silicon) | `MdPad-3.0.0-arm64.dmg` |
| macOS (Intel) | `MdPad-3.0.0.dmg` |
| Linux | `MdPad-3.0.0.AppImage` / `mdpad_3.0.0_amd64.deb` |

Full changelog: [CHANGELOG.md](https://github.com/Hyeonseok0830/mdViewer/blob/main/CHANGELOG.md)
