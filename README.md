# jvisualschool 방문자 피드백 시스템

정진호(jvisualschool) 홈페이지의 랜딩 페이지, 방문자 설문조사 페이지, 관리자 대시보드로 구성된 정적 웹 프로젝트입니다.
설문 문항은 **Markdown 파일(`data/questions.md`)** 로 관리하며, 코드 수정 없이 md 파일만 편집하면 문항이 즉시 반영됩니다.

---

## 1. 완료된 기능

### 랜딩 페이지 (`index.html`)
- 프로필 소개, SNS/블로그/GitHub 링크 카드
- 설문 페이지로 연결되는 CTA 버튼

### 방문자 설문조사 (`survey.html`)
- `data/questions.md` 를 fetch로 불러와 `js/survey-md-parser.js` 가 파싱
- 문항 타입 3종 지원: `[single]`(단일 선택), `[multi]`(중복 선택), `[text]`(서술형)
- "기타: __" 형식의 옵션은 자동으로 자유 서술 입력창으로 전환
- 단계별(Step-by-step) 진행 UI, 진행률 바, 이전/다음 네비게이션
- 제출 시 `tables/survey_responses` 테이블에 POST 저장
  - 응답 내용(JSON), referrer, 제출 페이지 URL, User-Agent 함께 기록

### 관리자 대시보드 (`admin.html`)
- 총 응답 수 / 오늘 응답 수 / 최다 유입 경로 / 최다 첫인상 통계 카드
- Chart.js 기반 문항별(Q1~Q4) 막대 차트
- Q5(서술형) 원문 리스트
- 전체 응답 테이블 (검색/필터 가능)
- CSV 내보내기 버튼

> ⚠️ **접근 제어 없음 (완전 공개 상태)**: `admin.html`은 현재 별도의 로그인/권한 제한이
> 걸려 있지 않습니다. 빠른 공유(정적 게시)는 서버 단 접근 규칙을 지원하지 않기 때문에,
> 사용자 요청에 따라 이전에 설정했던 `jvisualschool@gmail.com` 전용 접근 제어(allowlist)를
> **제거**했습니다. **URL(`/admin.html`)을 아는 사람은 누구나 응답 통계, 서술형 답변,
> 전체 응답 테이블, CSV 다운로드까지 열람할 수 있습니다.**
> 다시 보호하려면 Genspark Hosting(Hosted Deploy)으로 전환하고 접근 규칙을 재적용해야 합니다.

---

## 2. 주요 파일 및 엔트리 경로

| 경로 | 설명 | 접근 권한 |
|---|---|---|
| `/index.html` | 랜딩 페이지 | 공개 |
| `/survey.html` | 방문자 설문조사 | 공개 |
| `/admin.html` | 관리자 대시보드 | **공개 (접근 제어 없음)** ⚠️ |
| `/data/questions.md` | 설문 문항 원본(마크다운) | 공개(정적 파일) |
| `tables/survey_responses` (GET/POST) | 설문 응답 데이터 REST API | 공개 |

### 설문 문항 md 형식 (`data/questions.md`)
```md
## N. 질문 제목 [single|multi|text]

- 옵션1
- 옵션2
- 기타: __      ← "__" 로 끝나면 자유 서술형 "기타" 입력창 자동 생성
```
문항을 추가/수정/삭제하려면 이 파일만 편집하면 됩니다. 코드 변경이 필요 없습니다.

---

## 3. 데이터 모델

### 테이블: `survey_responses`
| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | text | 레코드 고유 ID (시스템 자동 생성) |
| `answers_json` | rich_text | 문항 ID(q1~q5)를 key로 하는 응답 JSON 문자열 |
| `referrer` | text | 방문자의 `document.referrer` |
| `page_url` | text | 설문 제출 시점의 페이지 URL |
| `user_agent` | text | 제출자의 브라우저 User-Agent |
| `created_at` / `updated_at` | 시스템 필드 | 생성/수정 시각 (ms) |

`answers_json` 예시:
```json
{
  "q1": { "title": "어떤 경로로...", "type": "single", "value": "SNS (Instagram, Facebook, Threads 등)" },
  "q2": { "title": "찾으러 오셨나요...", "type": "multi", "value": ["바이브 코딩 학습 자료", "디자인/일러스트 작품"] },
  "q5": { "title": "인상 깊었던 콘텐츠", "type": "text", "value": "바이브 코딩 튜토리얼이 유용했어요" }
}
```

> Preview(에디터 미리보기)와 Hosted Deploy 이후의 실제 운영 데이터는 서로 다른 저장소입니다.
> 지금 채워진 예시 응답 2건은 미리보기 데이터입니다. 실제 배포 후 방문자가 남긴 응답은
> Hosted Deploy 이후 라이브 데이터베이스에 별도로 쌓이며, admin.html은 그 라이브 데이터를 보여줍니다.

---

## 4. 아직 구현되지 않은 기능 / 추천 다음 단계

- [ ] 관리자 대시보드에 기간(날짜 범위) 필터
- [ ] 문항별 응답률(전체 응답 수 대비) 표시
- [ ] 관리자 대시보드 내 응답 개별 삭제 기능 (현재는 조회/CSV만 가능)
- [ ] 설문 다국어(영문) 버전 md 분리
- [ ] 설문 완료 후 감사 메일 자동 발송 (정적 사이트 한계상 서버리스 함수 또는 외부 폼 서비스 연동 필요)
- [ ] `data/questions.md`에 문항을 추가할 때 5지선다 외 척도형(1~5점) 질문 타입 지원 확장

---

## 5. 배포 안내

- 현재 변경사항은 배포 승인 전까지 라이브 사이트에 반영되지 않습니다.
- **관리자 페이지(`admin.html`)는 접근 제어가 제거된 완전 공개 상태입니다.** 빠른 공유(정적 게시) /
  Genspark Hosting(Hosted Deploy) 어느 쪽으로 배포하든 누구나 URL로 접근할 수 있습니다.
- 빠른 공유는 **Publish 탭**에서 바로 진행하실 수 있습니다.
- 나중에 관리자 페이지를 다시 보호하고 싶다면, Genspark Hosting(Hosted Deploy) 방식으로 전환하고
  접근 규칙(allowlist)을 재적용해야 합니다. 언제든 요청해 주시면 다시 설정해 드립니다.

---

## 6. 기술 스택

- HTML5 / CSS3 (커스텀, 다크 테마)
- Vanilla JavaScript (프레임워크 없음)
- [Chart.js](https://www.chartjs.org/) — 관리자 대시보드 차트
- [Font Awesome 6](https://fontawesome.com/) — 아이콘
- Google Fonts (Inter, Noto Sans KR)
- RESTful Table API (`tables/survey_responses`) — 데이터 저장/조회
- 플랫폼 Access Rules(Dispatcher) — 관리자 페이지 라우트 보호
