# SceneGame 구조화 지시서 (2026-10-01)

기획 세션 작성. **동작을 바꾸지 않는 리팩터링**이다. 목표는 콘텐츠가 늘어도 한 파일에 분기가 쌓이지 않게 책임을 나누는 것이다.

## 1. 현황 (코드 기준)

`scene/SceneGame.js` 는 748줄이며 한 클래스가 아래 11가지 책임을 모두 진다.

| # | 책임 | 해당 메서드 | 줄 수(대략) |
|---|---|---|---|
| 1 | 씬 수명주기와 조립 | `init`, `create`, `onResume`, `onShutdown`, `update`, `step` | 150 |
| 2 | 엔티티 레지스트리 | `registerEntity`, `unregisterEntity`, `entityById` | 15 |
| 3 | 월드(맵, 포탈, 장식, 좌표) | `buildMap`, `buildPortal`, `isFloorAt`, `decorateRooms`, `packCells`, `placeActorAt` | 90 |
| 4 | 스폰과 적 관리 | `enemyScale`, `bossEnrageParams`, `spawnEnemies`, `spawnRoomFeatures`, `spawnPack`, `addEnemy`, `summonMinions`, `alertPack`, `remaining`, `remainingInRoom` | 140 |
| 5 | 상호작용, 상자, 미믹 | `findInteractable`, `addInteractable`, `removeInteractable`, `openChest`, `dropChestRewards`, `spawnMimic` | 60 |
| 6 | 파티와 타깃팅 | `partyMembers`, `nearestTarget`, `nearestEnemy`, `nearestEnemyInCone`, `toggleTactic` | 60 |
| 7 | 전투 판정, 시간 | `meleeHit`, `aoeHit`, `fireProjectile`, `onProjectileHitEnemy`, `onProjectileHitParty`, `hitStop`, `clearHitStop`, `advanceCombatClock` | 90 |
| 8 | 처치 보상 | `itemOpts`, `onEnemyKilled`, `dropLoot` | 50 |
| 9 | 런 진행 | `openPortal`, `tryExit`, `nextFloor`, `finishRun`, `onPlayerDead`, `save`, `returnToHub` | 90 |
| 10 | 입력 수집 | `step` 안의 키 매핑과 액션 조립 | 35 |
| 11 | HUD 데이터 조립 | `step` 끝부분 | 10 |

문제가 되는 분기(CLAUDE.md "씬 코드에 분기를 늘리지 않는다" 원칙과 어긋나는 곳)

- `onEnemyKilled` 가 `boss / mimic / elite / 일반` 의 `if-else` 사슬이다. 새 몹 종류가 생길 때마다 늘어난다.
- `finishRun` 이 `daily / 일반` 분기이고, `onPlayerDead` 가 재도전 가능 여부를 직접 판단한다.
- 외부 클래스(`Actor`, `Enemy`, `Effects`, `Behaviors`, `Hazards`, `Chest`, `Spring` 등)가 `scene.` 로 부르는 메서드가 약 28종이다. 이 공개 면은 유지해야 한다.

## 2. 목표 구조

`SceneGame` 은 조립과 프레임 순서만 맡는 얇은 조정자로 만든다. 각 책임은 시스템 클래스로 옮긴다.

| 시스템 | 맡는 책임 | 옮겨 올 메서드 |
|---|---|---|
| `EntityRegistry` | 엔티티 ID | 2번 전부 |
| `WorldSystem` | 맵, 포탈, 장식, 좌표 질의 | 3번 전부 (`explored`, `dungeon`, `layer`, `blockers` 소유) |
| `SpawnSystem` | 적 스폰, 방 기능 배치, 소환, 경보, 남은 수 | 4번 전부, 5번의 `spawnMimic` |
| `CombatSystem` | 근접/광역/투사체 판정, 히트스톱, 전투 시계 | 7번 전부 |
| `Targeting` | 가장 가까운 적/대상 질의, 파티 조회, 전술 전환 | 6번 전부 |
| `RewardSystem` | 처치 보상, 상자 보상, 드롭 생성 | 5번의 `openChest`/`dropChestRewards`, 8번 전부 |
| `RunFlow` | 포탈, 층 이동, 클리어, 사망, 저장, 허브 복귀 | 9번 전부 |
| `InputCollector` | 키보드와 `InputState` 를 프레임 액션으로 변환 | 10번 |
| `HudBuilder` | HUD 이벤트 데이터 조립 | 11번 |

파일 위치는 구현 세션이 기존 규칙에 맞게 정한다(제안: `script/js/scene/game/`).

### 2-1. 분기를 레지스트리로 바꾸는 곳 (이번 작업의 핵심)

| 현재 분기 | 레지스트리 | 항목 |
|---|---|---|
| `onEnemyKilled` 의 `boss/mimic/elite/일반` | 처치 보상 핸들러 목록 (`registerKillReward`) | `boss`, `mimic`, `elite`, `normal` 을 각각 `{ match(enemy), reward(scene, enemy) }` 로 등록. 일치하는 첫 핸들러를 실행한다. 순서는 현재 분기 순서와 같다 |
| `finishRun` 의 `daily/일반` | 런 종료 핸들러 (`registerRunOutcome`) | `daily`, `normal` 각각 `{ match(run), finish(scene) }` |
| `onPlayerDead` 의 재도전 판단 | 위 런 종료 핸들러에 `canRetry(run)` 포함 | 던전 종류가 늘어도 한 곳에서 정의 |

`RoomTypes.js` 와 같은 방식이다.

### 2-2. 공개 면 유지 (중요)

외부 클래스가 부르는 `scene.X` 는 약 28종이다(`combatNow`, `registerEntity`/`unregisterEntity`, `hazards`, `isFloorAt`, `placeActorAt`, `fxTweens`, `nearestEnemy`, `fireProjectile`, `entityById`, `spawnPack`, `partyMembers`, `packCells`, `aoeHit`, `alertPack`, `addInteractable`/`removeInteractable`, `summonMinions`, `spawnMimic`, `remainingInRoom`, `openChest`, `onPlayerDead`, `onEnemyKilled`, `nearestTarget`, `nearestEnemyInCone`, `meleeHit`, `hitStop`, `dungeon`, `bossEnrageParams`).

- 이전 단계에서는 `SceneGame` 에 **같은 이름의 위임 메서드**를 남긴다. 외부 클래스는 한 줄도 바꾸지 않는다.
- 위임 메서드는 한 줄짜리 전달만 한다. 로직이 들어가면 안 된다.
- 위임 제거(호출부를 시스템으로 직접 연결)는 이번 범위에 넣지 않는다. 마지막에 따로 결정한다.

## 3. 단계 (각 단계는 독립 커밋, 검증 통과 후 다음 단계)

| 단계 | 작업 | 위험 |
|---|---|---|
| P0 | 재사용 가능한 **검증 도구** 정식화 (4절) | 낮음 |
| P1 | `EntityRegistry`, `InputCollector`, `HudBuilder` 분리 | 낮음 |
| P2 | `RunFlow` 분리 + 런 종료 핸들러 레지스트리 | 중간 |
| P3 | `RewardSystem` 분리 + 처치 보상 레지스트리 | 중간 |
| P4 | `CombatSystem`, `Targeting` 분리 | 중간 (호출 빈도가 높다) |
| P5 | `SpawnSystem` 분리 | 높음 (시드 결정성) |
| P6 | `WorldSystem` 분리 | 높음 (생성 순서) |

목표: P6 후 `SceneGame` 이 250줄 이하.

## 4. 검증 (가장 중요)

자동 테스트가 없으므로, 이번에 만든 검증을 **도구로 저장**한다(예: `tools/` 아래). 매 단계마다 다시 돌린다.

1. **시드 결정성:** 시드 5개 × 던전 4종 × 1~8층(보스 층 포함)의 (방 유형 목록, 적 총수, 적 좌표 해시, 상자·샘·미믹 좌표)를 리팩터링 전에 기록하고, 단계마다 모두 일치해야 한다.
2. **프레임 순서:** `step` 의 갱신 순서(플레이어 → 동료 → 적 → 위험 요소 → 상호작용 → HUD)가 바뀌지 않아야 한다.
3. **기능 스모크 체크리스트**
   - 일반 층: 적 처치 → 아이템/골드 드롭, 포탈 개방, 다음 층 이동
   - 보물방 상자 열기, 미믹 발동과 보상, 회복 샘 사용
   - 정예 무리 전멸 보상, 보스 처치 보상과 격노 표시
   - 마지막 층 클리어(일반/일일), 플레이어 사망(재도전 가능/불가)
   - 일시정지 후 재개 입력 초기화
4. **검증 진입점 유지:** `game.step(t, 16)` 과 `window.somaGame`, `scene.step`, `scene.perfUpdateMs` 는 이름과 동작을 유지한다(CLAUDE.md 검증 방법이 의존한다).
5. **성능:** 적 50마리 층에서 `perfUpdateMs` 평균을 전후로 측정해 ±5% 이내여야 한다.
6. `npm run check` 통과.

## 5. 규칙

- 동작 변경 금지. 버그를 발견해도 이번 작업에서 고치지 않고 따로 보고한다.
- 주석은 쓰지 않는다. 필요해 보이는 제약이 생기면 문구 후보를 제시해 사용자 확인을 받는다.
- 새 문자열을 만들지 않는다(기존 i18n 키만 사용).
- 난수 호출 순서를 바꾸지 않는다. 특히 `spawnRng`, `floorRng`, `GAME_RNG` 의 사용 순서.
- 수치 상수는 이동하지 않고 `Balance.js` / `Rooms.js` 에 그대로 둔다.

## 6. 범위 밖 (이번에 하지 않는다)

- `SceneUI`(659줄), `Enemy`(444줄) 구조화는 다음 과제로 남긴다.
- 매 프레임 `[...getChildren()]` 배열 복사, 이펙트 오브젝트 풀링은 별도 과제로 한다(성능 작업).
- 위임 메서드 제거.

## 7. 커밋 분할 (제안, 사용자 요청 시에만 커밋)

1. `refactor : 씬 검증 도구 정리`
2. `refactor : 엔티티 레지스트리, 입력 수집, HUD 조립 분리`
3. `refactor : 런 진행 분리와 런 종료 핸들러 도입`
4. `refactor : 처치 보상 분리와 보상 핸들러 도입`
5. `refactor : 전투 판정과 타깃팅 분리`
6. `refactor : 스폰 시스템 분리`
7. `refactor : 월드 시스템 분리`

## 8. 결정이 필요한 사항 (사용자)

- 위임 메서드를 최종적으로 제거할지(깔끔하지만 호출부 수정이 퍼진다), 영구 유지할지(수정은 적지만 얇은 껍데기가 남는다).
- 시스템 파일의 위치와 이름.
