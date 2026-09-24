# Classic Yacht v1

룰 ID: `classic-yacht-v1`. 사람별 12턴, 주사위 5개, 턴당 1~3회 굴림. 첫 굴림 이후 원하는 주사위를 보관하거나 해제할 수 있습니다. 하나의 빈 항목을 기록하면 차례가 끝납니다. 이미 기록한 항목은 바꿀 수 없으며 조건 불성립은 0점입니다.

| 항목 | 점수 |
| --- | --- |
| Ones~Sixes | 해당 눈 숫자의 합계 |
| Choice | 주사위 전체 합계 |
| Four of a Kind | 같은 눈이 4개 이상일 때 그중 4개 합계 |
| Full House | 정확히 같은 눈 3개 + 다른 눈 2개일 때 전체 합계 |
| Little Straight | 1,2,3,4,5 → 30 |
| Big Straight | 2,3,4,5,6 → 30 |
| Yacht | 같은 눈 5개 → 50 |

보너스, 3-of-a-kind, 조커, 추가 Yacht 보너스는 없습니다. 5개 동일은 Full House 0점이며 Four of a Kind에는 4개만 계산됩니다. 모두 기록하면 합계가 높은 플레이어가 승리합니다. 동점은 공동 순위(예: 1,1,3). 기권자는 순위 제외. 기권하지 않은 참가자가 1명이면 종료합니다.

## 조사 및 채택 근거

2026-09-24 확인:

- Family Games Treasurehouse, *25 Family Dice Games* (2009), Yacht 설명/점수표: https://www.party2geaux.com/wp-content/uploads/2017/12/dice-rules.pdf
- Yacht 개요 및 변형 비교: https://en.wikipedia.org/wiki/Yacht_(dice_game)
- 별도 구현자의 고전 규칙 설명: https://suitedgames.com/yacht/rules

출처의 표/설명을 복제하지 않고 본 프로젝트 규칙을 위와 같이 독립적으로 요약했습니다. Yacht에는 서로 다른 스트레이트·보너스 변형이 있으므로 UI, 엔진, 세이브 모두 이 룰 ID를 따릅니다. 닌텐도 51 Worldwide Games 변형(상단 보너스/4연속 작은 스트레이트)이나 Yahtzee와 혼합하지 않습니다.
