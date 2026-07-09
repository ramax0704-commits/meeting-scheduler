# 회의 일정 조율 웹앱 - 설정 가이드

비개발자를 위한 단계별 설정 방법입니다.

## 1단계: Supabase 계정 생성 및 프로젝트 설정

### 1-1. Supabase 가입
- https://supabase.com 방문
- "Start your project" 클릭
- Google, GitHub 등으로 가입

### 1-2. 새 프로젝트 생성
- "New Project" 버튼 클릭
- 프로젝트명: "meeting-scheduler" (원하는 이름으로)
- 데이터베이스 비밀번호 설정 및 저장 (나중에 필요)
- "Create new project" 클릭

### 1-3. 대기 (약 1-2분)
프로젝트가 생성될 때까지 기다리세요.

## 2단계: 데이터베이스 테이블 생성

### 2-1. SQL 에디터 열기
- Supabase 대시보드 왼쪽 메뉴에서 "SQL Editor" 클릭

### 2-2. 스크립트 실행
- "New query" 클릭
- `supabase_schema.sql` 파일의 내용 전체를 복사
- SQL 에디터에 붙여넣기
- "Run" 버튼 클릭

## 3단계: API 키 설정

### 3-1. API 키 찾기
- Supabase 대시보드에서 "Project Settings" (톱니바퀴 아이콘) 클릭
- 왼쪽 메뉴에서 "API" 선택
- "Project URL"과 "anon public" 키를 찾으세요

### 3-2. 환경변수 설정
프로젝트 폴더에서 `.env.local` 파일을 만들고:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`your-project-url`과 `your-anon-key`를 실제 값으로 바꾸세요.

**예시:**
```
VITE_SUPABASE_URL=https://xyzabc.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 4단계: 프로젝트 실행

### 터미널에서 다음 명령어 실행:
```bash
npm run dev
```

브라우저에서 http://localhost:5173 열기

## 주요 디렉토리 구조

```
meeting-scheduler/
├── src/
│   ├── config/          # Supabase 설정
│   ├── pages/           # 페이지 컴포넌트
│   ├── components/      # UI 컴포넌트
│   ├── hooks/           # 커스텀 훅
│   ├── utils/           # 유틸리티 함수 (API 호출)
│   └── styles/          # 스타일시트
├── supabase_schema.sql  # 데이터베이스 스키마
└── .env.example         # 환경변수 템플릿
```

## 데이터베이스 테이블 설명

### meetings
- 회의 정보 저장
- `share_link`: 공유할 때 사용하는 고유 링크

### time_slots
- 회의의 각 시간 슬롯
- 예: 2026-07-13 09:00~10:00

### participant_responses
- 참석자가 각 시간에 대해 응답 (가능/불가/미정)

## 주의사항

⚠️ `.env.local` 파일은 **절대 GitHub에 올리지 마세요**
- `.gitignore`에 이미 추가되어 있습니다
- API 키가 노출되면 보안 문제가 됩니다

## 다음 단계

설정이 완료되면:
1. 회의 생성 페이지 구현
2. 시간 그리드 UI 구현
3. 참석자 응답 UI 구현
4. 추천 시간 계산 로직
5. Vercel 배포

질문이 있으면 언제든지 물어보세요!
