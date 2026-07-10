import { useState, useEffect, useRef } from 'react';
import {
  getMeetingByLink,
  getTimeSlots,
  saveParticipantResponse,
  getMeetingResponses,
} from '../utils/api';
import dayjs from 'dayjs';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MIN_COLUMNS = 5; // 기본으로 항상 보여줄 날짜 칸 수
const MAX_COLUMNS = 7; // 회의 생성 시 최대 7일까지 선택 가능하므로 상한도 7

export default function ParticipantForm({ shareLink, onBack, onViewResult }) {
  const [meeting, setMeeting] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 화면 단계: 'select'(이름 선택) → 'time'(시간 선택)
  const [phase, setPhase] = useState('select');
  const [selectedParticipant, setSelectedParticipant] = useState('');

  const [selectedStatus, setSelectedStatus] = useState('unavailable'); // 현재 칠하는 붓: unavailable(빨강) / maybe(노랑)
  // 셀마다 상태를 따로 저장 { [cellId]: 'unavailable' | 'maybe' } — 두 상태가 서로 덮어쓰지 않도록
  const [cellStatus, setCellStatus] = useState({});
  const [comment, setComment] = useState(''); // 한마디 (선택)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [respondedNames, setRespondedNames] = useState(new Set()); // 이미 응답한 참석자 이름

  // 드래그 상태는 ref로 관리(포인터 이벤트에서 최신값을 바로 읽기 위해)
  const draggingRef = useRef(false);
  const dragModeRef = useRef('paint'); // paint(칠하기) / erase(지우기)
  const selectedStatusRef = useRef(selectedStatus);
  selectedStatusRef.current = selectedStatus;

  useEffect(() => {
    loadMeetingData();
  }, [shareLink]);

  // 드래그 도중 그리드 밖에서 손을 떼도 드래그가 확실히 끝나도록
  useEffect(() => {
    const end = () => {
      draggingRef.current = false;
    };
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    return () => {
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
    };
  }, []);

  const loadMeetingData = async () => {
    try {
      setLoading(true);
      const { success, data: meetingData } = await getMeetingByLink(shareLink);
      if (!success) {
        setError('회의를 찾을 수 없습니다.');
        return;
      }

      setMeeting(meetingData);

      const { success: slotsSuccess, data: slotsData } = await getTimeSlots(meetingData.id);
      if (slotsSuccess) {
        setTimeSlots(slotsData);
      }

      // 이미 응답한 참석자 목록 (응답 완료 / 미응답 구분용)
      const { success: respSuccess, data: respData } = await getMeetingResponses(meetingData.id);
      if (respSuccess) {
        setRespondedNames(new Set(respData.map((r) => r.participant_name)));
      }
    } catch (err) {
      setError('데이터를 불러올 수 없습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 데이터를 다 불러오기 전에는 아래 화면 계산을 하지 않는다 (meeting이 null이면 에러 방지)
  if (loading) return <div className="card">로드 중...</div>;
  if (error) return <div className="card error-message">{error}</div>;
  if (!meeting) return <div className="card">회의를 찾을 수 없습니다.</div>;

  // 실제 생성된 슬롯의 날짜들(개별 선택이라 연속이 아닐 수 있음)
  const meetingDates = [...new Set(timeSlots.map((slot) => slot.slot_date))].sort();
  const hours = [...new Set(timeSlots.map((slot) => slot.start_time))].sort();

  // 이름이 채워진 참석자만 목록에 노출
  const participantList = (meeting.participants || []).filter((p) => p.name && p.name.trim());

  // 그리드 날짜 칸: 기본 5칸, 실제 날짜가 6~7일이면 그만큼 늘림
  const columnCount = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, meetingDates.length));
  const lastDate = meetingDates[meetingDates.length - 1] || dayjs().format('YYYY-MM-DD');
  const columns = Array.from({ length: columnCount }, (_, i) => {
    if (i < meetingDates.length) {
      return { date: meetingDates[i], active: true };
    }
    // 남는 칸도 요일/날짜는 이어서 표기하되, 선택은 불가(비활성 자리)
    const fillerDate = dayjs(lastDate).add(i - meetingDates.length + 1, 'day').format('YYYY-MM-DD');
    return { date: fillerDate, active: false };
  });
  const gridTemplateColumns = `44px repeat(${columnCount}, minmax(0, 1fr))`;

  const getCellId = (date, time) => `${date}-${time}`;

  const applyCell = (cellId, mode) => {
    setCellStatus((prev) => {
      const next = { ...prev };
      if (mode === 'erase') {
        delete next[cellId];
      } else {
        next[cellId] = selectedStatusRef.current; // 현재 붓 색으로 칠함(다른 색이었으면 덮어씀)
      }
      return next;
    });
  };

  // 드래그 시작(마우스/터치/펜 공통 - pointerdown)
  const handlePointerDown = (date, time) => {
    const cellId = getCellId(date, time);
    // 시작 셀이 이미 현재 붓 색이면 '지우기', 아니면 '칠하기' 모드로 드래그
    const mode = cellStatus[cellId] === selectedStatus ? 'erase' : 'paint';
    dragModeRef.current = mode;
    draggingRef.current = true;
    applyCell(cellId, mode);
  };

  // 드래그 이동: 터치는 pointermove가 시작 셀에만 오므로 손가락 아래 셀을 직접 찾는다
  const handlePointerMove = (e) => {
    if (!draggingRef.current) return;
    e.preventDefault(); // 그리드 위에서 드래그하는 동안 페이지 세로 스크롤 방지
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const cell = el && el.closest('[data-time]');
    if (!cell) return;
    const date = cell.getAttribute('data-day');
    const time = cell.getAttribute('data-time');
    applyCell(getCellId(date, time), dragModeRef.current);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
  };

  const handleSubmit = async () => {
    if (!selectedParticipant) {
      alert('참석자를 선택해주세요');
      setPhase('select');
      return;
    }

    setIsSubmitting(true);
    try {
      // 칠한 시간대별로, 각 셀에 저장된 상태(빨강/노랑) 그대로 저장
      const slotPromises = timeSlots
        .map((slot) => ({ slot, status: cellStatus[getCellId(slot.slot_date, slot.start_time)] }))
        .filter(({ status }) => status)
        .map(({ slot, status }) =>
          saveParticipantResponse(meeting.id, slot.id, selectedParticipant, status)
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

  // ── 1단계: 회의 정보 + 참석자(본인) 선택 ─────────────────────
  if (phase === 'select') {
    return (
      <div className="participant-form">
        <button className="back-button" onClick={onBack}>
          ← 뒤로
        </button>

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
          </div>

          <h4 className="pf-section-label">본인 이름을 선택해주세요</h4>
          <div className="name-select-list">
            {participantList.length > 0 ? (
              participantList.map((p) => {
                const responded = respondedNames.has(p.name);
                return (
                  <button
                    key={p.id}
                    className={`name-option ${selectedParticipant === p.name ? 'selected' : ''}`}
                    onClick={() => setSelectedParticipant(p.name)}
                  >
                    <span className="name-option-left">
                      <span className="name-option-name">{p.name}</span>
                      <span className="name-role">{p.isRequired ? '필수' : '선택'}</span>
                    </span>
                    <span className={`resp-chip ${responded ? 'done' : 'pending'}`}>
                      {responded ? '✓ 응답 완료' : '미응답'}
                    </span>
                  </button>
                );
              })
            ) : (
              <p className="text-sm">등록된 참석자가 없습니다.</p>
            )}
          </div>

          <div className="form-actions" style={{ flexDirection: 'column' }}>
            <button
              className="btn btn-primary"
              onClick={() => setPhase('time')}
              disabled={!selectedParticipant}
            >
              다음 →
            </button>
            {onViewResult && (
              <button className="btn btn-secondary" onClick={onViewResult}>
                📊 응답 현황 보기
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── 2단계: 가능한 시간 입력 ─────────────────────────────────
  return (
    <div className="participant-form">
      <button className="back-button" onClick={() => setPhase('select')}>
        ← 뒤로
      </button>

      <div className="card">
        <div className="pf-header">
          <h2 className="pf-title">{meeting.title}</h2>
          <p className="pf-subtitle">안 되는 시간과 피하고 싶은 시간을 칠해주세요</p>
        </div>

        {/* 상태 토글 */}
        <div className="status-toggle">
          <button
            className={`toggle-option ${selectedStatus === 'unavailable' ? 'active-unavailable' : ''}`}
            onClick={() => setSelectedStatus('unavailable')}
          >
            <span className="toggle-main">
              <span className="status-dot unavailable"></span>
              일정이 있어요
            </span>
            <span className="toggle-hint">외근, 마감, 다른 회의 등</span>
          </button>
          <button
            className={`toggle-option ${selectedStatus === 'maybe' ? 'active-maybe' : ''}`}
            onClick={() => setSelectedStatus('maybe')}
          >
            <span className="toggle-main">
              <span className="status-dot maybe"></span>
              되도록 피하고 싶어요
            </span>
            <span className="toggle-hint">점심 직후, 늦은 시간 등</span>
          </button>
        </div>

        {/* 그리드 (날짜 헤더 고정 + 시간 세로 스크롤) */}
        <div className="pf-grid">
          <div className="pf-grid-header" style={{ gridTemplateColumns }}>
            <div className="pf-corner"></div>
            {columns.map((col, idx) => (
              <div key={idx} className={`pf-date-head ${col.active ? '' : 'inactive'}`}>
                <span className="pf-dow">{WEEKDAYS[dayjs(col.date).day()]}</span>
                <span className="pf-dnum">{dayjs(col.date).date()}</span>
              </div>
            ))}
          </div>

          <div
            className="pf-grid-scroll"
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {hours.map((time) => (
              <div key={time} className="pf-grid-row" style={{ gridTemplateColumns }}>
                <div className="pf-time-label">{time.substring(0, 5)}</div>
                {columns.map((col, idx) => {
                  if (!col.active) {
                    return <div key={idx} className="pf-cell placeholder" />;
                  }
                  const status = cellStatus[getCellId(col.date, time)];
                  return (
                    <div
                      key={idx}
                      className={`pf-cell ${status ? `selected-${status}` : ''}`}
                      data-day={col.date}
                      data-time={time}
                      onPointerDown={() => handlePointerDown(col.date, time)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <p className="pf-scroll-hint">위아래로 스크롤하면 모든 시간을 볼 수 있어요</p>

        {/* 한마디 입력 */}
        <div className="form-group">
          <label>한마디 (선택)</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="점심 직후는 졸려서 피하고 싶어요"
          />
        </div>

        {/* 제출 버튼 */}
        <div className="form-actions">
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '저장 중...' : '제출하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
