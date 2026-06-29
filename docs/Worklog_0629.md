# Worklog — 2026-06-29

## 오늘 한 일

Eyes 확장에 **상황별 표정 반응** 3종을 추가했다. 기존엔 클릭 시 "놀람"(`!?` +
땀방울 + 흔들림) 반응만 있었는데, 코드/작업 상태에 따라 눈이 감정을 표현하도록 확장.

### 1. 에러 시 "불안한" 표정

- 두 가지 소스로 에러를 감지해 불안 상태를 토글한다.
  | 소스 | 잡는 것 | 지속 |
  |------|---------|------|
  | 정적 진단 (`onDidChangeDiagnostics`) | 문법/타입/린트 에러 | 에러 있는 **동안 계속** |
  | 터미널 실패 (`onDidEndTerminalShellExecution`, exit ≠ 0) | 런타임 에러·빌드 실패 | **약 4.5초** 반응 후 진정 |
- 정적 진단만으로는 `print(3/0)` 같은 **런타임 에러**를 못 잡아서(문법은 정상),
  shell integration API로 터미널 종료 코드를 보는 두 번째 소스를 추가.
- 터미널 API는 VS Code 1.93+ 라 `typeof ... === 'function'` 가드로 구버전 호환.
- 불안 표정: 눈꺼풀 살짝 찡그림 + 땀방울 반복(`anxSweat` 키프레임) + 동공 떨림.

### 2. 동공 떨림 강조

- 불안 시 동공 흔들림 진폭을 `±2px` → 약 `±5.5px/±4px`(`* 11`, `* 8`)로 키워
  "패닉"이 또렷하게 보이도록 조정.

### 3. 유휴 5분 → "피곤한" 표정

- `IDLE_MS = 5분`. 30초마다 유휴 시간을 확인해 초과 시 졸린 상태로.
- 피곤 표정: 눈꺼풀 무겁게 반쯤 감김(`0.58`) + 시선 아래로 처짐 + 느린 사인 흔들림.
- **활동 감지**(클럭 리셋): 에디터 입력·커서·스크롤·에디터 전환, 터미널 실행,
  눈 위 마우스 이동/클릭, 패널 재표시.
  - 눈 위 마우스는 확장이 못 보므로 webview → 확장 `active` 핑(2초 throttle)으로 전달.

### 공통 인프라

- 상태 우선순위: **놀람 > 불안 > 피곤** (render에서 가드).
- webview가 새로 빌드될 때 `ready` 시점에 sticky 상태(anxious/tired) 재전송.
- `prefers-reduced-motion`: 흔들림 제거, 땀방울·눈꺼풀은 정적으로 표현.
- 설정 `eyes.reactToErrors`(기본 `true`)로 에러 반응 on/off.

변경 파일: `extension.js`, `media/eyes.js`, `package.json`. (아직 마켓 배포 안 함 —
최근에 배포해서 다음에 묶어서 게시 예정.)

## 배운 점

- **정적 진단 ≠ 런타임 에러.** `vscode.languages.getDiagnostics`는 언어 서버가
  보고하는 정적 에러만 본다. `ZeroDivisionError`처럼 실행 중 터지는 건 문법이
  멀쩡하니 진단에 안 뜬다 → 터미널 종료 코드(`onDidEndTerminalShellExecution`)를
  따로 봐야 잡힌다.
- **webview는 자기 영역 밖 입력을 못 본다.** 눈 패널 위 마우스 움직임은 확장이
  모르므로, webview에서 `active` 메시지를 throttle 해서 호스트로 올려 유휴 클럭을
  공유해야 했다.
- 상태가 여러 개 겹칠 수 있어(에러+유휴 등) render 단계에서 우선순위 가드를 두는
  게 깔끔. 상태별 boolean + sticky 재전송(`ready`) 패턴이 webview 재생성에 강함.

## 내일 할 일

- [ ] `F5` Extension Dev Host로 세 표정 실제 동작 확인 (특히 터미널 실패 → 불안,
      5분 유휴 → 피곤; 임시로 `IDLE_MS` 낮춰 테스트).
- [ ] 검증 후 버전 범프 + VS Marketplace/Open VSX 배포 (`eyes-deployer`).
- [ ] README에 새 표정 동작 / `eyes.reactToErrors` 설정 안내 추가 검토.
