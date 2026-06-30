# Worklog — 2026-06-30

## 오늘 한 일

Eyes 확장을 "처음 설치했을 때 어색한" 상태에서 **제품다운 v0.0.3**으로 다듬어 양대
마켓에 배포했다. 배치·로딩·테마 대응·테스트·문서까지 한 바퀴 정리.

### 1. 기본 배치: 자체 Activity Bar → Explorer

- 마켓 첫 설치 시 자체 Activity Bar 컨테이너(아이콘 클릭해야 열림)라 첫인상이
  어색했다. 뷰를 내장 `explorer` 컨테이너로 옮기고 `visibility: "visible"`로 설정 →
  설치 즉시 Explorer 안에 노출.
- `viewsContainers.activitybar`의 `eyes` 컨테이너 제거. 뷰 id(`eyes.view`)는 유지해
  `eyes.start`/`eyes.surprise`의 `eyes.view.focus` 그대로 동작.
- 한계: "파일 트리 위 최상단 고정"은 매니페스트로 강제 불가(내장 File Explorer가
  항상 먼저). 사용자가 드래그하면 위치는 머신 로컬에 유지.

### 2. 로딩 지연 개선

- 증상: 뷰가 한참 뒤에 뜸. 원인은 **지연 활성화**(`onView:eyes.view`만 있어 뷰가
  뷰포트에 들어와야 활성화) + 웹뷰 iframe 콜드 스타트.
- `activationEvents`에 `onStartupFinished` 추가(시작 직후 provider 준비).
- `registerWebviewViewProvider`에 `webviewOptions: { retainContextWhenHidden: true }`
  → 접었다 펴도 재빌드 없이 즉시 복귀.

### 3. 테마 적응 (배경·외곽선·눈꺼풀)

- **바깥 배경**: 하드코딩 `#efe9df` → `var(--vscode-sideBar-background, …)`
  (`extension.js` body, `media/eyes.js` 컨테이너). 패널에 자연스럽게 녹아듦.
- **눈 외곽선**: 다크 배경에서 `#14110f` 테두리가 묻혀 안 보임 → CSS 변수
  `--eye-rim`을 `body.vscode-dark`/`vscode-high-contrast` 클래스로 분기(밝은=검정,
  다크=`#7d776f`, 고대비=`#d4cfc4`). 테마 전환에 자동 반응.

### 4. 다크 테마 "어색함" 디버깅

- 처음엔 눈꺼풀(lid)도 배경색(`BG`)을 따라가게 했는데 **다크에서 어색**했다.
- 추측 대신 **브라우저로 실제 렌더해 확인**: 로컬 HTTP 서버(`file://` 직접 접근은
  막힘)로 다크 배경 하네스를 띄워 확대 캡처.
- 원인 확정: 눈꺼풀이 평상시에도 눈알 상단 16%를 덮는데, 배경색=어두움이라 흰
  눈알을 파고드는 **어두운 후드**처럼 보였다. (밝은 테마에선 크림색이라 안 보이던 것)
- 해결: 눈꺼풀은 "배경"이 아니라 **항상 밝은 눈알 위의 눈꺼풀**이므로 고정 크림으로
  되돌림. 이후 요청대로 한 단계 더 어둡게(`#e3dccd`/`#d6cdbb`) 조정.
- 놀람 표정의 **땀방울**이 눈과 겹쳐 `right: -34px → -46px`로 바깥으로 이동.

### 5. 통합 테스트 하네스 추가

- `@vscode/test-cli` + `@vscode/test-electron` + `mocha` 도입(`npm test`,
  `.vscode-test.mjs`). 실제 VS Code 1.126.0을 받아 그 안에서 실행.
- gaze 계산을 순수 함수 `computeGaze`로 분리·export → 테스트 가능하게.
- `test/extension.test.js`: 활성화/명령 등록/설정 기본값/**Explorer 뷰 기여** +
  gaze 순수 로직 6종. **11 passing**.
- 패키징/깃 무시 갱신(`test/`, `.vscode-test/`, `node_modules/` 등).

### 6. 문서 & 배포

- `README.md`: Activity Bar → Explorer 배치, 테마 적응, 테스트 안내로 갱신.
  새 `CHANGELOG.md`로 0.0.3 변경점 정리(마켓 Changelog 탭 노출).
- `eyes-deployer` 에이전트로 풀 파이프라인: 검증(`npm test` 11 passing) → 버전
  `0.0.2→0.0.3` → 빌드 → **VS Marketplace + Open VSX 게시** → 커밋/푸시.
  - 릴리스 커밋 `d2baf59`(`release: v0.0.3`).
- 에이전트가 짚어준 누락 수정: `.vscodeignore`에 `.claude/`·`docs/` 제외 추가
  (커밋 `094464f`). 0.0.3 VSIX엔 들어갔으나 시크릿 노출은 없음.
- 게시된 VSIX 커밋(`d2baf59`)에 **annotated 태그 `v0.0.3`** 붙여 푸시(첫 태그).
- `eyes-deployer` 정의에 **태그 단계(step 8)** 추가: 게시 성공 시에만, 릴리스
  커밋에, idempotent하게 `v<version>` 태그 생성·푸시.

## 배운 점

- **"배경색=눈꺼풀"의 함정.** 원래 디자인이 밝은 배경을 전제(크림 눈꺼풀=얼굴)라,
  배경을 테마색으로 바꾸자 다크에서 눈꺼풀이 어두운 후드가 됐다. 눈꺼풀은 배경이
  아니라 **항상 밝은 눈알**에 맞춰야 한다. → 비주얼은 추측 말고 **실제 렌더로 확인**.
- **`retainContextWhenHidden`은 webview 속성이 아니다.** WebviewView에선
  `registerWebviewViewProvider(…, { webviewOptions: { retainContextWhenHidden } })`로
  전달해야 한다. webview 객체에 직접 세팅하면 무효.
- **테마 적응은 CSS 변수 + body 클래스.** VS Code가 webview body에 붙이는
  `vscode-dark`/`vscode-light`/`vscode-high-contrast`로 `--eye-rim` 같은 변수를
  분기하면 재시작 없이 테마 전환에 자동 반응. 인라인 스타일도 `var()`는 캐스케이드를
  탄다.
- **릴리스 태그는 "게시된 VSIX 커밋"에.** 이후 정리 커밋이 아니라, 실제로 패키징·
  게시된 커밋(`d2baf59`)에 태그를 붙여야 아티팩트와 일치한다.
- **`.vscodeignore` 점검.** 새로 생긴 `.claude/`·`docs/`가 빠져 VSIX에 섞여 들어갔다.
  새 디렉터리 추가 시 패키징 무시 목록도 같이 갱신.

## 내일 할 일

- [ ] 양대 마켓 리스팅에 v0.0.3 실제 반영됐는지 확인.
- [ ] (선택) `eyes-deployer` 정의 변경을 `claude-dotfiles` repo에 동기화.
- [ ] (선택) `v0.0.3` 태그로 GitHub Release(노트 + `eyes-0.0.3.vsix` 첨부) 생성 검토.
- [ ] 다음 릴리스(0.0.4)는 정리된 `.vscodeignore`로 패키지 슬림 확인.
