import { useState } from 'react';
import { createMeeting, createTimeSlots } from '../utils/api';
import dayjs from 'dayjs';

export default function CreateMeeting({ onSuccess, onBack }) {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [datePickerMode, setDatePickerMode] = useState('week');
  const [dateSelectStart, setDateSelectStart] = useState(null);
  const [dateSelectEnd, setDateSelectEnd] = useState(null);

  // 기본정보 (조율자명 제거, 회의길이 추가)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: dayjs().add(6, 'day').format('YYYY-MM-DD'),
    duration_minutes: 60,
    time_start: 8,
    time_end: 22,
    is_recurring: false,
    recurrence_days: 7,
  });

  // 참석자 - 1개만 기본값, 선택 상태로 시작
  const [participants, setParticipants] = useState([
    { id: 0, name: '', isRequired: false },
  ]);
  const [nextParticipantId, setNextParticipantId] = useState(1);

  const [createdMeeting, setCreatedMeeting] = useState(null);

  // 입력값 변경
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : name.includes('_') ? parseInt(value) || value : value,
    }));
  };

  // 참석자명 변경
  const handleParticipantChange = (id, value) => {
    const updatedParticipants = participants.map((p) =>
      p.id === id ? { ...p, name: value } : p
    );
    setParticipants(updatedParticipants);
  };

  // 필수/선택 토글
  const handleParticipantToggle = (id) => {
    const updatedParticipants = participants.map((p) =>
      p.id === id ? { ...p, isRequired: !p.isRequired } : p
    );
    setParticipants(updatedParticipants);
  };

  // 참석자 추가
  const handleAddParticipant = () => {
    setParticipants([
      ...participants,
      { id: nextParticipantId, name: '', isRequired: false },
    ]);
    setNextParticipantId(nextParticipantId + 1);
  };

  // 참석자 삭제
  const handleRemoveParticipant = (id) => {
    setParticipants(participants.filter((p) => p.id !== id));
  };

  // 날짜 선택 처리
  const handleDateClick = (date) => {
    const selectedDate = dayjs(date).format('YYYY-MM-DD');

    if (selectedDate === dateSelectStart && !dateSelectEnd) {
      setDateSelectStart(null);
      return;
    }

    if (selectedDate === dateSelectStart && selectedDate === dateSelectEnd) {
      setDateSelectStart(null);
      setDateSelectEnd(null);
      return;
    }

    if (!dateSelectStart) {
      setDateSelectStart(selectedDate);
      setDateSelectEnd(null);
    } else if (!dateSelectEnd) {
      if (dayjs(selectedDate).isBefore(dayjs(dateSelectStart))) {
        setDateSelectStart(selectedDate);
        setDateSelectEnd(null);
      } else {
        // 최대 7일까지만 선택 가능
        const daysDiff = dayjs(selectedDate).diff(dayjs(dateSelectStart), 'day');
        if (daysDiff > 6) {
          setError('최대 7일까지만 선택 가능합니다');
          return;
        }
        setDateSelectEnd(selectedDate);
        setFormData((prev) => ({
          ...prev,
          start_date: dateSelectStart,
          end_date: selectedDate,
        }));
      }
    } else {
      setDateSelectStart(selectedDate);
      setDateSelectEnd(null);
    }
  };

  // 주간 선택 렌더링
  const renderWeekPicker = (isNextWeek = false) => {
    const today = dayjs();
    const startDate = isNextWeek ? today.startOf('week').add(1, 'week') : today;
    const days = [];
    for (let i = 0; i < 7; i++) {
      days.push(startDate.add(i, 'day'));
    }

    return (
      <div className="week-picker">
        <div className="week-days">
          {days.map((day) => {
            const dateStr = day.format('YYYY-MM-DD');
            const dayOfWeek = ['일', '월', '화', '수', '목', '금', '토'][day.day()];
            const isStart = dateStr === dateSelectStart;
            const isEnd = dateStr === dateSelectEnd;
            const isInRange =
              dateSelectStart &&
              dateSelectEnd &&
              dayjs(dateStr).isAfter(dayjs(dateSelectStart)) &&
              dayjs(dateStr).isBefore(dayjs(dateSelectEnd));

            return (
              <button
                key={dateStr}
                className={`week-day ${isStart ? 'selected-start' : ''} ${isEnd ? 'selected-end' : ''} ${isInRange ? 'in-range' : ''}`}
                onClick={() => handleDateClick(dateStr)}
              >
                <div className="week-day-label">{dayOfWeek}</div>
                <div className="week-day-date">{day.date()}</div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // 월간 캘린더 렌더링
  const renderMonthCalendar = () => {
    const today = dayjs();
    const firstDay = today.startOf('month');
    const lastDay = today.endOf('month');
    const daysInMonth = lastDay.date();
    const startingDayOfWeek = firstDay.day();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const weeks = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div className="month-picker">
        <div className="calendar-header">
          <span>{today.format('YYYY년 M월')}</span>
        </div>
        <div className="calendar-weekdays">
          {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
            <div key={day} className="weekday">
              {day}
            </div>
          ))}
        </div>
        <div className="calendar-days">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="calendar-week">
              {week.map((day, dayIdx) => {
                if (!day) {
                  return <div key={dayIdx} className="calendar-day empty"></div>;
                }
                const dateStr = today.date(day).format('YYYY-MM-DD');
                const isStart = dateStr === dateSelectStart;
                const isEnd = dateStr === dateSelectEnd;
                const isInRange =
                  dateSelectStart &&
                  dateSelectEnd &&
                  dayjs(dateStr).isAfter(dayjs(dateSelectStart)) &&
                  dayjs(dateStr).isBefore(dayjs(dateSelectEnd));

                return (
                  <div
                    key={dayIdx}
                    className={`calendar-day active ${isStart ? 'selected-start' : ''} ${isEnd ? 'selected-end' : ''} ${isInRange ? 'in-range' : ''}`}
                    onClick={() => handleDateClick(dateStr)}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 다음 단계
  const handleNext = () => {
    setError(null);
    if (step === 1) {
      if (!formData.title.trim()) {
        setError('회의명을 입력해주세요');
        return;
      }
    }
    if (step === 3) {
      const filledParticipants = participants.filter((p) => p.name.trim());
      if (filledParticipants.length < 2) {
        setError('최소 2명 이상의 참석자를 입력해주세요');
        return;
      }
    }
    setStep(step + 1);
  };

  // 회의 생성
  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { success, data: meeting } = await createMeeting({
        ...formData,
        organizer_name: participants[0]?.name || '조율자',
        participants: participants.map((p) => ({
          id: p.id,
          name: p.name,
          isRequired: p.isRequired,
        })),
      });

      if (!success) {
        setError('회의 생성 실패');
        return;
      }

      const slots = generateTimeSlots(
        formData.start_date,
        formData.end_date,
        formData.time_start,
        formData.time_end,
        formData.duration_minutes,
        formData.is_recurring,
        formData.recurrence_days
      );

      const { success: slotsSuccess } = await createTimeSlots(meeting.id, slots);

      if (!slotsSuccess) {
        setError('시간 슬롯 생성 실패');
        return;
      }

      setCreatedMeeting(meeting);
      setStep(4);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 슬롯 생성 로직
  const generateTimeSlots = (startDate, endDate, timeStart, timeEnd, duration, isRecurring, recurrenceDays) => {
    const slots = [];
    let currentDate = dayjs(startDate);
    const endDateObj = dayjs(endDate);

    while (currentDate.isBefore(endDateObj) || currentDate.isSame(endDateObj)) {
      for (let hour = timeStart; hour < timeEnd; hour++) {
        const startMinutes = hour * 60;
        const endMinutes = startMinutes + duration;
        const endHour = Math.floor(endMinutes / 60);

        if (endHour <= timeEnd) {
          slots.push({
            date: currentDate.format('YYYY-MM-DD'),
            startTime: `${String(hour).padStart(2, '0')}:00:00`,
            endTime: `${String(endHour).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`,
          });
        }
      }

      if (isRecurring) {
        currentDate = currentDate.add(recurrenceDays, 'day');
      } else {
        currentDate = currentDate.add(1, 'day');
      }
    }

    return slots;
  };

  return (
    <div className="create-meeting">
      <button className="back-button" onClick={() => (step === 1 ? onBack() : setStep(step - 1))}>
        ← 뒤로
      </button>

      {step !== 4 && (
        <div className="form-header">
          <h2>새 회의 만들기</h2>
          <div className="steps-indicator">
            <div className={`step ${step >= 1 ? 'active' : ''}`}>1</div>
            <div className={`step ${step >= 2 ? 'active' : ''}`}>2</div>
            <div className={`step ${step >= 3 ? 'active' : ''}`}>3</div>
          </div>
        </div>
      )}

      {error && <div className="error-message">{error}</div>}

      {/* Step 1: 기본정보 + 회의길이 */}
      {step === 1 && (
        <div className="card">
          <h3>기본 정보</h3>
          <div className="form-group">
            <label>회의명</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              placeholder="예: 4분기 킥오프 미팅"
            />
          </div>

          <div className="form-group">
            <label>설명</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="회의 내용에 대해 설명해주세요"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>회의 길이</label>
            <div className="duration-buttons">
              <button
                className={`duration-btn ${formData.duration_minutes === 30 ? 'active' : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, duration_minutes: 30 }))}
              >
                30분
              </button>
              <button
                className={`duration-btn ${formData.duration_minutes === 60 ? 'active' : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, duration_minutes: 60 }))}
              >
                1시간
              </button>
              <button
                className={`duration-btn ${formData.duration_minutes === 120 ? 'active' : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, duration_minutes: 120 }))}
              >
                2시간
              </button>
              <button
                className={`duration-btn ${formData.duration_minutes === 180 ? 'active' : ''}`}
                onClick={() => setFormData((prev) => ({ ...prev, duration_minutes: 180 }))}
              >
                3시간 이상
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleNext}>
              다음 →
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 후보 일시 */}
      {step === 2 && (
        <div className="card">
          <h3>후보 일시</h3>

          <div className="form-group">
            <label>기간 선택</label>
            <div className="date-mode-buttons">
              <button
                className={`btn ${datePickerMode === 'week' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setDatePickerMode('week');
                  setDateSelectStart(null);
                  setDateSelectEnd(null);
                }}
              >
                이번주
              </button>
              <button
                className={`btn ${datePickerMode === 'nextweek' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setDatePickerMode('nextweek');
                  setDateSelectStart(null);
                  setDateSelectEnd(null);
                }}
              >
                다음주
              </button>
              <button
                className={`btn ${datePickerMode === 'month' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => {
                  setDatePickerMode('month');
                  setDateSelectStart(null);
                  setDateSelectEnd(null);
                }}
              >
                월간
              </button>
            </div>
          </div>

          {datePickerMode === 'week' && renderWeekPicker(false)}
          {datePickerMode === 'nextweek' && renderWeekPicker(true)}
          {datePickerMode === 'month' && renderMonthCalendar()}

          <div className="form-group">
            <label>회의 시간 범위</label>
            <div className="form-row time-range">
              <div className="time-input-group">
                <div className="form-sublabel">시작 시간</div>
                <select name="time_start" value={formData.time_start} onChange={handleInputChange}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
              <div className="time-input-group">
                <div className="form-sublabel">종료 시간</div>
                <select name="time_end" value={formData.time_end} onChange={handleInputChange}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, '0')}:00
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-group checkbox">
            <label>
              <input
                type="checkbox"
                name="is_recurring"
                checked={formData.is_recurring}
                onChange={handleInputChange}
              />
              매주 반복
            </label>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleNext}>
              다음 →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 참석자 */}
      {step === 3 && (
        <div className="card">
          <h3>참석자</h3>

          <div className="participants-section">
            {participants.map((participant) => (
              <div key={participant.id} className="participant-row">
                <input
                  type="text"
                  value={participant.name}
                  onChange={(e) => handleParticipantChange(participant.id, e.target.value)}
                  placeholder="참석자명"
                  className="participant-name-input"
                />

                <div
                  className={`toggle-group ${participant.isRequired ? 'required' : 'optional'}`}
                  onClick={() => handleParticipantToggle(participant.id)}
                  role="button"
                  tabIndex={0}
                >
                  <span className={`toggle-btn ${!participant.isRequired ? 'active' : ''}`}>
                    선택
                  </span>
                  <span className={`toggle-btn ${participant.isRequired ? 'active' : ''}`}>
                    필수
                  </span>
                </div>

                {participants.length > 1 && (
                  <button
                    className="remove-btn"
                    onClick={() => handleRemoveParticipant(participant.id)}
                    title="삭제"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>

          <button className="add-participant-btn" onClick={handleAddParticipant}>
            + 참석자 추가
          </button>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleCreate} disabled={isLoading}>
              {isLoading ? '생성 중...' : '회의 생성'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: 완료 */}
      {step === 4 && createdMeeting && (
        <div className="card success-card">
          <h3>✅ 회의가 생성되었습니다!</h3>

          <div className="meeting-info">
            <p>
              <strong>회의명:</strong> {createdMeeting.title}
            </p>
            <p>
              <strong>기간:</strong> {createdMeeting.start_date} ~ {createdMeeting.end_date}
            </p>
          </div>

          <div className="share-section">
            <h4>공유 링크</h4>
            <div className="share-link">
              <code>{`${window.location.origin}/meeting/${createdMeeting.share_link}`}</code>
              <button
                className="btn btn-secondary"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/meeting/${createdMeeting.share_link}`);
                  alert('공유 링크가 복사되었습니다!');
                }}
              >
                복사
              </button>
            </div>

            <div className="share-buttons">
              <button
                className="btn btn-primary"
                onClick={() => {
                  const fullUrl = `${window.location.origin}/meeting/${createdMeeting.share_link}`;
                  if (navigator.share) {
                    navigator.share({
                      title: '회의 일정 조율',
                      text: `${createdMeeting.title} 회의에 참석해주세요!`,
                      url: fullUrl,
                    }).catch((err) => console.log('공유 취소'));
                  } else {
                    alert('이 브라우저에서는 공유 기능을 지원하지 않습니다.');
                  }
                }}
              >
                📤 공유하기
              </button>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" onClick={onSuccess}>
              처음으로 돌아가기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
