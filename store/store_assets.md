# Microsoft Store 제출 체크리스트

## 필수 이미지 에셋 (Partner Center 제출 시 필요)

아래 이미지를 `assets/store/` 폴더에 준비하세요.
`scripts/make-icon.ps1`을 실행하면 자동 생성됩니다 (ImageMagick 필요).

| 파일명 | 크기 | 용도 |
|--------|------|------|
| `Square44x44Logo.png` | 44×44 | 작은 타일 / 앱 목록 |
| `Square150x150Logo.png` | 150×150 | 중간 타일 |
| `Square310x310Logo.png` | 310×310 | 큰 타일 |
| `Wide310x150Logo.png` | 310×150 | 와이드 타일 |
| `StoreLogo.png` | 50×50 | Store 검색 결과 |
| `SplashScreen.png` | 620×300 | 스플래시 화면 |
| `icon.ico` | 256×256 (ICO) | 앱 아이콘 (Windows) |

> 각 이미지는 100%, 125%, 150%, 200%, 400% 배율 버전도 함께 제출하면 고DPI 화면에서 선명하게 표시됩니다.
> 예: `Square150x150Logo.scale-100.png`, `Square150x150Logo.scale-200.png`

## Partner Center 제출 정보

### 앱 기본 정보

| 항목 | 값 |
|------|---|
| 앱 이름 | MdPad |
| 앱 ID (영문) | MdPad |
| 카테고리 | 생산성 > 개발자 도구 |
| 서브 카테고리 | 유틸리티 |
| 연령 등급 | 전체 이용가 |
| 가격 | 무료 |

### 지원 언어

- 한국어 (ko-KR) — 기본
- 영어 (en-US)

### 시스템 요구 사항

| 항목 | 최소 | 권장 |
|------|------|------|
| OS | Windows 10 (1903+) | Windows 11 |
| 아키텍처 | x64 | x64 |
| RAM | 512MB | 2GB |
| 저장공간 | 400MB | 400MB |

### 개인정보 처리방침 URL

GitHub Pages 또는 별도 URL에 호스팅 필요:
- `https://hyeonseok0830.github.io/MdPad/privacy` (예시)
- 또는 `store/privacy_policy_en.md` 내용을 웹페이지로 게시

## MSIX 패키지 정보 (package.json build.appx)

제출 전 `package.json`의 `build.appx` 섹션을 실제 값으로 업데이트하세요:

```json
"appx": {
  "applicationId": "MdPad",
  "displayName": "MdPad",
  "identityName": "YOUR_PUBLISHER_ALIAS.MdPad",
  "publisher": "CN=YOUR_DISPLAY_NAME, O=YOUR_ORG, C=KR",
  "publisherDisplayName": "YOUR_DISPLAY_NAME",
  "backgroundColor": "#0d1117",
  "languages": ["ko-KR", "en-US"]
}
```

> `identityName`과 `publisher`는 Microsoft Partner Center → 앱 관리 → 앱 ID에서 확인하세요.

## 제출 순서

1. [ ] `scripts/make-icon.ps1` 실행 → 아이콘 생성
2. [ ] `npm run electron:build:appx` 실행 → MSIX 생성
3. [ ] [Partner Center](https://partner.microsoft.com/dashboard) 로그인
4. [ ] 새 앱 제출 생성
5. [ ] 패키지: `release/*.appx` 업로드
6. [ ] 스토어 목록: `store/description_ko.md` + `store/description_en.md` 내용 입력
7. [ ] 이미지: `assets/store/` 폴더 이미지 업로드
8. [ ] 개인정보 처리방침 URL 입력
9. [ ] 제출 → 인증 대기 (보통 1~3 영업일)
