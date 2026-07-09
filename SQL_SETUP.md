# Supabase 데이터베이스 설정 - 단계별 가이드

## 🎯 목표
Supabase 데이터베이스에 3개의 테이블(meetings, time_slots, participant_responses) 생성하기

## ✅ 단계별 진행

### 1단계: Supabase 대시보드 열기
1. 브라우저에서 https://supabase.com/dashboard 방문
2. 이메일/Google/GitHub로 로그인
3. 프로젝트 목록에서 "meeting-scheduler" 프로젝트 클릭

### 2단계: SQL Editor 열기
1. 왼쪽 메뉴에서 **"SQL Editor"** 찾기
2. **"New query"** 버튼 클릭
3. 빈 SQL 에디터 창이 열림

### 3단계: SQL 복사 & 붙여넣기
1. 로컬 컴퓨터에서 `supabase_schema.sql` 파일 열기
2. **전체 내용 복사** (Ctrl+A, Ctrl+C / Mac: Cmd+A, Cmd+C)
3. Supabase SQL Editor에 **붙여넣기** (Ctrl+V / Mac: Cmd+V)

### 4단계: 실행
1. 오른쪽 위에 있는 **"Run" 버튼** 클릭 (재생 버튼 모양)
2. 또는 **Ctrl+Enter** (Mac: Cmd+Enter) 단축키 사용

### 5단계: 완료 확인
성공하면 SQL Editor 아래에 다음 메시지가 보임:
```
3 rows affected
```

## 📋 SQL 내용 (참고용)

`supabase_schema.sql` 파일에는 다음이 포함됩니다:

```sql
-- 회의 테이블
CREATE TABLE meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  organizer_name TEXT NOT NULL,
  share_link TEXT UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_days INTEGER,
  time_start INTEGER DEFAULT 8,
  time_end INTEGER DEFAULT 22,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- 시간 슬롯 테이블
CREATE TABLE time_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- 참석자 응답 테이블
CREATE TABLE participant_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  time_slot_id UUID NOT NULL REFERENCES time_slots(id) ON DELETE CASCADE,
  participant_name TEXT NOT NULL,
  status TEXT DEFAULT 'undecided',
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(meeting_id, time_slot_id, participant_name)
);

-- 인덱스 생성
CREATE INDEX idx_meetings_share_link ON meetings(share_link);
CREATE INDEX idx_time_slots_meeting_id ON time_slots(meeting_id);
CREATE INDEX idx_participant_responses_meeting_id ON participant_responses(meeting_id);
CREATE INDEX idx_participant_responses_time_slot_id ON participant_responses(time_slot_id);
```

## 🔍 설정 확인

설정 후 테이블이 제대로 만들어졌는지 확인:

1. 왼쪽 메뉴에서 **"Table Editor"** 클릭
2. 다음 3개 테이블이 보이면 성공:
   - ✅ meetings
   - ✅ time_slots
   - ✅ participant_responses

## ⚠️ 문제 해결

### "Permission denied" 오류
- 로그인된 계정이 프로젝트 소유자인지 확인
- Supabase 대시보드에서 프로젝트 설정 확인

### "Already exists" 오류
- 테이블이 이미 생성되었다는 뜻
- 무시하고 진행해도 됨

### SQL이 실행되지 않음
- 코드 전체가 선택되었는지 확인
- Run 버튼이 파란색인지 확인 (초록색이면 실행 중)
- 잠시 기다렸다가 새로고침 (F5)

## 💡 다음 단계

SQL 설정이 완료되면:

```bash
cd meeting-scheduler
npm run dev
```

http://localhost:5173 에서 웹앱 실행 가능!

## 📞 도움말

각 테이블의 역할:

| 테이블명 | 용도 |
|---------|------|
| **meetings** | 회의 정보 저장 (제목, 조율자, 날짜 등) |
| **time_slots** | 각 회의의 시간 블록 (08:00~22:00, 30분 단위) |
| **participant_responses** | 참석자 응답 (가능/불가/회피/미정) |

질문이 있으면 언제든 물어보세요!
