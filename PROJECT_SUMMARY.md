# 회의 일정 조율 웹앱 - 프로젝트 요약

## 완료한 작업

### 1. 프로젝트 초기화
- ✅ React + Vite 프로젝트 생성
- ✅ 필요한 npm 라이브러리 설치 (@supabase/supabase-js, dayjs, axios)

### 2. 프로젝트 구조 설정
```
meeting-scheduler/
├── src/
│   ├── config/supabase.js       # Supabase 클라이언트 설정
│   ├── utils/api.js              # API 호출 함수 모음
│   ├── styles/globals.css        # 전역 스타일
│   ├── components/               # UI 컴포넌트 (폴더만 생성)
│   ├── pages/                    # 페이지 (폴더만 생성)
│   └── hooks/                    # 커스텀 훅 (폴더만 생성)
├── SETUP.md                      # Supabase 설정 가이드
├── supabase_schema.sql           # DB 스키마 SQL
├── .env.example                  # 환경변수 템플릿
└── vite.config.js               # Vite 설정
```

### 3. Supabase 데이터베이스 스키마
생성된 3개 테이블:

1. **meetings** - 회의 정보
   - id: UUID (기본키)
   - title: 회의명
   - organizer_name: 조율자명
   - share_link: 공유 링크 (고유)
   - start_date, end_date: 기간
   - is_recurring, recurrence_days: 반복 설정
   - time_start(08), time_end(22): 기본 시간대

2. **time_slots** - 시간 슬롯
   - 각 회의의 30분 블록들 저장
   - slot_date, start_time, end_time

3. **participant_responses** - 참석자 응답
   - 참석자별 응답 (available/unavailable/maybe/undecided)
   - meeting_id와 time_slot_id 조합으로 추적

### 4. 기본 유틸리티 함수
`src/utils/api.js`에 구현:
- createMeeting() - 회의 생성
- getMeetingByLink() - 공유 링크로 회의 조회
- createTimeSlots() - 시간 슬롯 생성
- getTimeSlots() - 시간 슬롯 조회
- saveParticipantResponse() - 참석자 응답 저장
- getMeetingResponses() - 응답 조회
- calculateRecommendedSlots() - 추천 시간 계산

### 5. 스타일 시스템
TickTick 스타일 정의:
- 색상: 포인트 #4772FA, 불가 #F0524B, 회피 #F5A623
- 카드: 라운드 12px, 보더 1px #EFEFEF
- 폰트 웨이트: 400, 500만 사용

### 6. 기본 UI
- 홈 페이지: 회의 만들기 / 참가하기
- 라우팅 구조 설정 (page state)
- 반응형 레이아웃

## 다음 구현할 기능

### Phase 1: 회의 생성 (기본)
- [ ] 회의 생성 폼
  - 회의명, 설명
  - 조율자명
  - 기간 선택
  - 시간대 설정 (08:00~22:00 기본)
  - 참석자 추가
  - '매주 반복' 토글

- [ ] 시간 슬롯 자동 생성
  - 30분 단위로 슬롯 생성
  - DB에 저장

- [ ] 공유 링크 생성
  - QR 코드 생성 (선택)

### Phase 2: 참석자 응답 (핵심)
- [ ] 그리드 UI
  - Y축: 참석자명 (1~6명)
  - X축: 날짜별 시간 (30분 블록)
  - 드래그로 상태 선택 (불가/회피/미정/가능)

- [ ] 색상 표시
  - 가능: 연두색
  - 불가: 빨강
  - 회피: 주황
  - 미정: 회색

- [ ] 24시간 스크롤 (기본 08:00~22:00)

### Phase 3: 조율자 뷰 (분석)
- [ ] 응답 취합 뷰
  - 각 슬롯별 응답 현황
  - 히트맵 (색 농도로 표현)

- [ ] 추천 시간 화면
  - 상위 3개 슬롯 표시
  - 근거 표시
    - "필참 N명 모두 가능"
    - "회피 최소 M명"
    - "선택 옵션 K명"

### Phase 4: 배포
- [ ] Vercel 배포 설정
- [ ] 환경변수 설정
- [ ] 도메인 연결 (선택)

## 사용 기술

| 기술 | 용도 |
|------|------|
| React 19 | UI 프레임워크 |
| Vite 8 | 번들러 |
| Supabase | Backend + Database |
| Day.js | 날짜 처리 |
| Axios | API 호출 |

## 환경설정

### 필수 작업
1. SETUP.md 따라 Supabase 프로젝트 생성
2. supabase_schema.sql 실행하여 테이블 생성
3. .env.local 파일 생성 (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

### 로컬 실행
```bash
npm run dev
# http://localhost:5173 에서 확인
```

### 프로덕션 빌드
```bash
npm run build
```

## 주요 파일 설명

| 파일 | 설명 |
|------|------|
| src/config/supabase.js | Supabase 클라이언트 초기화 |
| src/utils/api.js | DB 작업 함수 모음 |
| src/styles/globals.css | TickTick 스타일 변수 정의 |
| SETUP.md | Supabase 설정 가이드 |
| supabase_schema.sql | DB 스키마 |

## 주의사항

⚠️ .env.local 파일은 절대 GitHub에 올리지 말 것
⚠️ Supabase API 키 노출 금지
⚠️ .gitignore에 .env, .env.local 추가됨

## 비개발자 가이드

이 프로젝트는 React와 Supabase를 사용합니다:
- **React**: 화면과 상호작용을 만드는 부분
- **Supabase**: 데이터를 저장하고 관리하는 부분
- **Vite**: 개발할 때 빠르게 화면을 보여주는 도구

SETUP.md 파일을 읽고 따라하면 시작할 수 있습니다!
