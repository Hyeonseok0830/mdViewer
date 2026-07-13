# MdPad 3.2.0

Vault management release — link-safe renames, full file management, templates, slash commands and image paste.
볼트 관리 릴리즈 — 링크가 깨지지 않는 이름 변경, 완전한 파일 관리, 템플릿, 슬래시 명령, 이미지 붙여넣기.

## ✨ New Features / 새 기능

**EN**
- **Link-safe renames**: renaming a note automatically rewrites every `[[wiki link]]` (including `[[alias|labels]]` and `![[embeds]]`) across the vault — no more broken links
- **Full file management**: drag & drop notes between folders, create/rename/delete folders (right-click a folder, or drop a note on the "Files" header to move it to the vault root)
- **Outgoing links panel**: see every note the current note references, including not-yet-created ones — click to jump or create
- **Templates**: put notes in a `templates/` folder and insert them from the command palette with `{{date}}`, `{{time}}`, `{{title}}` variables
- **Slash commands**: type `/` in the editor for instant headings, checkboxes, tables, callouts, code blocks, wiki links and more
- **Image paste**: paste an image from the clipboard straight into the editor — it's saved to `attachments/` and linked automatically; vault images now render in preview too
- Empty folders now appear in the file explorer

**KO**
- **링크가 깨지지 않는 이름 변경**: 노트 이름을 바꾸면 볼트 전체의 `[[위키링크]]`(별칭 `[[이름|라벨]]`, 임베드 `![[이름]]` 포함)가 자동으로 재작성됩니다
- **완전한 파일 관리**: 드래그&드롭으로 노트를 폴더 간 이동, 폴더 생성/이름변경/삭제 (폴더 우클릭 메뉴, "파일" 헤더에 드롭하면 루트로 이동)
- **아웃고잉 링크 패널**: 현재 노트가 참조하는 모든 노트를 사이드바에 표시 — 미생성 노트도 표시되며 클릭 시 생성
- **템플릿**: `templates/` 폴더에 노트를 넣으면 명령 팔레트에서 삽입 가능, `{{date}}` `{{time}}` `{{title}}` 변수 지원
- **슬래시 명령**: 에디터에서 `/` 입력 → 제목·체크박스·표·콜아웃·코드 블록·위키링크 등 즉시 삽입
- **이미지 붙여넣기**: 클립보드 이미지를 에디터에 붙여넣으면 `attachments/`에 저장되고 자동으로 링크 삽입 — 볼트 내 이미지가 미리보기에서도 표시됩니다
- 빈 폴더도 파일 탐색기에 표시

## 📦 Downloads / 다운로드

| Platform | File |
|---|---|
| Windows (installer) | `MdPad.Setup.3.2.0.exe` |
| Windows (portable) | `MdPad.3.2.0.exe` |
| Windows (Store) | `MdPad.3.2.0.appx` / `.msix` |
| macOS (Apple Silicon) | `MdPad-3.2.0-arm64.dmg` |
| macOS (Intel) | `MdPad-3.2.0.dmg` |
| Linux | `MdPad-3.2.0.AppImage` / `mdpad_3.2.0_amd64.deb` |

Full changelog: [CHANGELOG.md](https://github.com/Hyeonseok0830/mdViewer/blob/main/CHANGELOG.md)
