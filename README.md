# Soma

NDS 액션 RPG '소마 브링거'의 메커닉에서 영감을 받은 세로형 HTML5 핵앤슬래시 프로토타입입니다. Phaser 3.60 기반이며 원작의 롬이나 에셋은 사용하지 않고, CC0 스프라이트 팩으로 새로 만든 오리지널 게임입니다.

- 세로형 540x960, 모바일 터치와 PC 키보드·마우스 모두 지원
- 3단 콤보, 대시, 브레이크 게이지, 히트스톱 기반 타격감
- 전사·궁수·법사 3직업, AI 동료 2명이 함께 다니는 파티
- 지역별 던전, 무한 심층, 일일 던전(시드 고정)
- 10칸 장비 슬롯과 무작위 접사 장비, 무기별 외관 교체
- 한국어·영어 로컬라이징

## 실행

Node.js와 git만 있으면 됩니다. 외부 npm 의존성은 없습니다.

```bash
git clone https://github.com/nexus0824/Soma.git
cd Soma
npm start
```

브라우저에서 `http://localhost:8080` 을 엽니다.

| 명령 | 설명 |
|---|---|
| `npm start` | 개발용 정적 서버 (포트 8080) |
| `npm run check` | 모든 JS 파일 문법 검사 |
| `npm run atlas` | 원본 타일셋 팩(`assets/raw`, 저장소 미포함)에서 아틀라스 재생성 |

## 조작

| 동작 | PC | 모바일 |
|---|---|---|
| 이동 | WASD / 방향키 | 왼쪽 화면 가상 조이스틱 |
| 공격 | 마우스 왼쪽 클릭 (클릭 위치 방향) | 공격 버튼 |
| 대시 | 마우스 오른쪽 클릭 / Space | 대시 버튼 |
| 스킬 | K, L, ; | 스킬 버튼 |
| 가방·캐릭터 | I / ESC | 가방 버튼 |
| 디버그 오버레이 | F3 또는 `?debug=1` | `?debug=1` |

## 구조

```
index.html            진입점
dev-server.js         정적 서버
assets/atlas/         0x72 DungeonTileset II 아틀라스와 라이선스
tools/                아틀라스 빌드, 문법 검사, 시트 뷰어
script/js_lib/        Phaser 3.60
script/js/
  Main.js, Define.js  게임 설정, 상수
  scene/              Preload, Title, Hub, Game, UI, Result, Debug
  core/               Actor, Player, Companion, Enemy, Character, Dungeon, Loot, FX
  combat/             AttackController, Effects(스킬 효과 레지스트리), HitFeedback
  ai/                 Navigation(흐름장), Behaviors, Steering
  anim/               PoseRig(무기 키프레임 애니메이션)
  data/               Classes, Skills, Enemies, Items, WeaponLooks, WeaponAnims,
                      Dungeons, Modifiers, Impacts, Balance, Autotile
  i18n/               I18n.js, locales/ko.js, locales/en.js
  ui/Layout.js        HUD와 패널 좌표
  manager/            ResourceManager, SaveManager
```

- 새 직업·적·스킬·장비 슬롯은 `data/*.js` 에 데이터를 추가하고, 필요하면 `combat/Effects.js` 나 `ai/Behaviors.js` 레지스트리에 핸들러를 등록하는 것으로 끝나야 합니다.
- 화면에 보이는 모든 문자열은 `i18n/locales/*.js` 에만 있고 코드는 `t(key, params)` 로 조회합니다.
- 난이도·밀집도·AI 수치는 `data/Balance.js` 한 곳에서 조정합니다.
- 히트스톱 중 게임 로직은 별도 전투 시계(`combatNow`)로 멈추고, 타격 연출은 전용 트윈 매니저로 계속 움직입니다.

## 세이브

브라우저 localStorage에 저장되며 PC와 브라우저마다 따로입니다. 저장 형식 버전이 바뀌면 `manager/SaveManager.js` 의 마이그레이션이 자동으로 변환합니다.

## 라이선스

- 스프라이트와 타일: [0x72 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii) v1.7, CC0. `assets/atlas/LICENSE_0x72.txt` 참고.
- Phaser: MIT.
