import { useState, useEffect } from 'react';
import { getMeetingByLink, getTimeSlots, saveParticipantResponse } from '../utils/api';
import dayjs from 'dayjs';

export default function ParticipantForm({ shareLink, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [selectedStatus, setSelectedStatus] = useState('unavailable'); // unavailable, maybe
  const [selectedCells, setSelectedCells] = useState(new Set());
  const [participantName, setParticipantName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadMeetingData();
  }, [shareLink]);

  const loadMeetingData = async () => {
    try {
      setLoading(true);
      const { success, data: meetingData } = await getMeetingByLink(shareLink);
      if (!success) {
        setError('회의를 찾을 수 없습니다.');
        return;
      }

      console.log('Meeting data:', meetingData);
      setMeeting(meetingData);

      const { success: slotsSuccess, data: slotsData } = await getTimeSlots(meetingData.id);
      console.log('Time slots:', slotsData);
      if (slotsSuccess) {
        setTimeSlots(slotsData);
      }
    } catch (err) {
      setError('데이터를 불러올 수 없습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 회의 기간 내 모든 날짜 생성 (항상 7개, 또는 선택된 기간만큼)
  const getAllDatesInRange = () => {
    const dates = [];
    let current = dayjs(meeting.start_date);
    const end = dayjs(meeting.end_date);

    while (current.isSameOrBefore(end)) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }

    return dates.sort();
  };

  const dates = getAllDatesInRange();
  const hours = [...new Set(timeSlots.map((slot) => slot.start_time))].sort();
  const availableDateSet = new Set(timeSlots.map((slot) => slot.slot_date));

  const getCellId = (date, time) => `${date}-${time}`;

  const handleCellMouseDown = (date, time) => {
    setIsDragging(true);
    toggleCell(date, time);
  };

  const handleCellMouseEnter = (date, time) => {
    if (isDragging) {
      toggleCell(date, time);
    }
  };

  const handleCellMouseUp = () => {
    setIsDragging(false);
  };

  const toggleCell = (date, time) => {
    const cellId = getCellId(date, time);
    const newSelected = new Set(selectedCells);
    if (newSelected.has(cellId)) {
      newSelected.delete(cellId);
    } else {
      newSelected.add(cellId);
    }
    setSelectedCells(newSelected);
  };

  const handleSubmit = async () => {
    if (!participantName.trim()) {
      alert('이름을 입력해주세요');
      return;
    }

    setIsSubmitting(true);
    try {
      // 선택된 시간대별로 응답 저장
      const slotPromises = timeSlots
        .filter((slot) => selectedCells.has(getCellId(slot.slot_date, slot.start_time)))
        .map((slot) =>
          saveParticipantResponse(meeting.id, slot.id, participantName, selectedStatus)
        );

      await Promise.all(slotPromises);
      alert('응답이 저장되었습니다!');
      onBack();
    } catch (err) {
      alert('저장 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="card">로드 중...</div>;
  if (error) return <div className="card error-message">{error}</div>;
  if (!meeting) return <div className="card">회의를 찾을 수 없습니다.</div>;

  return (
    <div className="participant-form">
      <button className="back-button" onClick={onBack}>
        ← 뒤로
      </button>

      {/* 회의 정보 섹션 */}
      <div className="card">
        <h3>회의 정보</h3>
        <div className="meeting-summary">
          <p>
            <strong>회의명:</strong> {meeting.title}
          </p>
          {meeting.description && (
            <p>
              <strong>설명:</strong> {meeting.description}
            </p>
          )}
          <p>
            <strong>회의 길이:</strong> {meeting.duration_minutes}분
          </p>
          <p>
            <strong>기간:</strong> {meeting.start_date} ~ {meeting.end_date}
          </p>
        </div>

        <h4>참석자</h4>
        <div className="participants-list">
          {meeting.participants && meeting.participants.length > 0 ? (
            meeting.participants.map((p) => (
              <div key={p.id} className="participant-item">
                <span>{p.name}</span>
                <span className={`badge ${p.isRequired ? 'required' : 'optional'}`}>
                  {p.isRequired ? '필수' : '선택'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm">참석자 정보가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 조건 입력 섹션 */}
      <div className="card">
        <h3>가능한 시간 입력</h3>

        {/* 상태 토글 */}
        <div className="status-toggle">
          <button
            className={`toggle-option ${selectedStatus === 'unavailable' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('unavailable')}
          >
            <span className="status-dot unavailable"></span>
            안 되는 시간
          </button>
          <button
            className={`toggle-option ${selectedStatus === 'maybe' ? 'active' : ''}`}
            onClick={() => setSelectedStatus('maybe')}
          >
            <span className="status-dot maybe"></span>
            되도록 피하고 싶은 시간
          </button>
        </div>

        {/* 그리드 */}
        <div className="time-grid-container">
          <div className="time-grid" onMouseLeave={() => setIsDragging(false)}>
            {/* 헤더: 날짜 */}
            <div className="grid-header">
              <div className="time-column"></div>
              {dates.map((date) => (
                <div key={date} className="date-column">
                  {dayjs(date).format('M월D일')}
                </div>
              ))}
            </div>

            {/* 행: 시간대 */}
            {hours.map((time) => (
              <div key={time} className="grid-row">
                <div className="time-label">{time.substring(0, 5)}</div>
                {dates.map((date) => {
                  const cellId = getCellId(date, time);
                  const isSelected = selectedCells.has(cellId);
                  const isActive = availableDateSet.has(date);

                  return (
                    <div
                      key={cellId}
                      className={`grid-cell ${isSelected ? `selected-${selectedStatus}` : ''} ${!isActive ? 'disabled' : ''}`}
                      onMouseDown={() => isActive && handleCellMouseDown(date, time)}
                      onMouseEnter={() => isActive && handleCellMouseEnter(date, time)}
                      onMouseUp={handleCellMouseUp}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 하마디 입력 */}
        <div className="form-group">
          <label>하마디 (선택)</label>
          <input
            type="text"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            placeholder="점심 직후는 졸려서 피하고 싶어요"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="form-actions">
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? '저장 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
