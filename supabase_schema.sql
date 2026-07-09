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
  recurrence_days INTEGER, -- 주 단위 반복 (7 = 매주)
  time_start INTEGER DEFAULT 8, -- 24시간 형식 (08:00)
  time_end INTEGER DEFAULT 22, -- 24시간 형식 (22:00)
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
  status TEXT DEFAULT 'undecided', -- 'available', 'unavailable', 'maybe', 'undecided'
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(meeting_id, time_slot_id, participant_name)
);

-- 인덱스
CREATE INDEX idx_meetings_share_link ON meetings(share_link);
CREATE INDEX idx_time_slots_meeting_id ON time_slots(meeting_id);
CREATE INDEX idx_participant_responses_meeting_id ON participant_responses(meeting_id);
CREATE INDEX idx_participant_responses_time_slot_id ON participant_responses(time_slot_id);
