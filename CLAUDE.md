# Soma 프로젝트 규칙

## 프로젝트 방향

- NDS '소마 브링거'의 메커닉에서 영감을 받은 오리지널 게임. 원작 롬·에셋은 저작권 문제로 사용하지 않는다.
- 가로형(960x540) 모바일 우선, PC 키보드·마우스 병행. 세로형은 2026-10-01에 비교 후 폐기했다(좌우 시야 부족, 버튼이 플레이 영역을 가림).
- 도형 에셋 대신 2D 스프라이트(0x72 DungeonTileset II, CC0). 새 에셋도 라이선스가 명확한 것만 쓴다.
- 핵앤슬래시 타격감이 핵심: 콤보·이동 잠금·히트스톱·넉백·브레이크. 무작위 휘두르기는 금지.
- 항상 확장성을 우선한다. 즉흥적인 특수 처리 대신 데이터와 레지스트리로 푼다.

## 코드 규칙

- 주석은 쓰지 않는다. 코드에서 이유를 알 수 없는 제약이나 우회가 있을 때만 후보이며, 그 경우에도 사용자에게 문구를 먼저 확인받는다.
- 화면 문자열은 `script/js/i18n/locales/*.js` 에만 둔다. 코드와 데이터 파일에 한글 리터럴을 쓰지 않고 `t(key, params)` 로 조회한다. 아이템 이름은 저장하지 않고 `itemName()` 으로 조합한다. 새 문자열은 ko와 en 모두 추가한다.
- 새 직업·적·스킬·장비 슬롯·던전은 `data/*.js` 와 레지스트리(`combat/Effects.js`, `ai/Behaviors.js`)에 데이터·핸들러 추가로 끝나야 한다. 씬 코드에 분기를 늘리지 않는다.
- 레이아웃 수치는 `ui/Layout.js`, 난이도·밀집도·AI·대시 수치는 `data/Balance.js` 에만 둔다. 적의 사거리·돌진 거리는 화면 좌우 반폭(480px) 안에서 시작되게 유지한다.
- 적과 동료의 이동은 `ai/Steering.js` 의 분리 조향을 공유한다. 적↔적, 동료↔적 사이에 하드 콜라이더를 추가하지 않는다(교착 원인).
- 무기 외관은 `data/WeaponLooks.js` 의 look 항목으로 정의하고 `Actor.setWeaponLook()` 으로 바꾼다. 무기 동작은 `data/WeaponAnims.js` 키프레임과 `anim/PoseRig.js` 로만 만든다.
- 전투 로직의 시간은 `scene.combatNow` 를 쓴다. `scene.time.now` 는 실시간이라 히트스톱 중에도 흐른다. 타격 연출 트윈은 `scene.fxTweens`, 배우 동작 트윈은 `scene.tweens` 를 쓴다.
- 세이브 형식을 바꾸면 `core/Character.js` 의 SAVE_VERSION 을 올리고 `manager/SaveManager.js` 에 마이그레이션을 추가한다.

## 커밋 규칙

- 형식: `prefix : 한글 커밋 멘트` (예: `feat : 장비 슬롯 10칸으로 확장`).
- 한 줄로 끝나지 않는 변경은 커밋을 나눈다. 여러 줄 메시지는 쓰지 않는다.
- Co-Authored-By 나 생성 도구 서명 트레일러를 붙이지 않는다.
- 사용자가 요청할 때만 커밋·푸시한다.

## 검증 방법

- `npm run check` 로 문법 검사.
- 브라우저 패인은 RAF가 자주 스로틀되므로 시간 기반 관찰이 불안정하다. 이동·AI·전투는 JS로 `game.loop.delta = 16; game.step(t, 16)` 루프를 돌려 프레임을 직접 시뮬레이션한다. `window.somaGame` 이 게임 인스턴스다.
- Phaser 3.60 TweenManager 는 Date.now() 기반이라 수동 스텝에서는 실시간이 지나야 진행된다. 트윈 검증은 스텝 사이에 실제 시간을 흘려야 한다.
- 성능 오버레이는 F3 또는 `?debug=1`. 아틀라스 시트 확인은 `tools/atlas-viewer.html`.
- 시드 결정성 검증은 브라우저 콘솔에서 `const SC = await import('/tools/seed-check.js')` 로 불러 `captureSnapshots`/`diffSnapshots`/`saveBaseline`/`loadBaseline`/`measurePerf` 를 쓴다. 스폰·맵·보상 코드를 바꾸기 전에 기준값을 저장하고, 바꾼 뒤 불일치 0건을 확인한다.
- 벽 오토타일은 Godot 3x3 minimal 템플릿 순서(`data/Autotile.js`)를 따른다.

## 대화 태도

- 무조건 동의하지 않는다. 맞으면 이유와 함께 동의하고, 틀리거나 위험하면 근거를 들어 반박한다. 트레이드오프는 양쪽을 모두 제시한다.
