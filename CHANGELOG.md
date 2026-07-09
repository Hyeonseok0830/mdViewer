# Changelog

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
