import { useState, useEffect } from 'react';
import { getMeetingByLink, getTimeSlots, getMeetingResponses } from '../utils/api';
import dayjs from 'dayjs';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MIN_COLUMNS = 5;
const MAX_COLUMNS = 7;

export default function OrganizerView({ shareLink, onBack }) {
  const [meeting, setMeeting] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [tab, setTab] = useState('status'); // 'status'(응답 현황) | 'rec'(추천 시간)
  const [onlyRequired, setOnlyRequired] = useState(false); // 필참 전원 가능만 강조
  const [selectedCell, setSelectedCell] = useState(null); // 탭한 셀 {date, time}

  useEffect(() => {
    loadData();
  }, [shareLink]);

  const loadData = async () => {
    try {
      setLoading(true);
      const { success, data: m } = await getMeetingByLink(shareLink);
      if (!success) {
        setError('회의를 찾을 수 없습니다.');
        return;
      }
      setMeeting(m);
      const [slotsRes, respRes] = await Promise.all([
        getTimeSlots(m.id),
        getMeetingResponses(m.id),
      ]);
      if (slotsRes.success) setTimeSlots(slotsRes.data);
      if (respRes.success) setResponses(respRes.data);
    } catch (err) {
      setError('데이터를 불러올 수 없습니다.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="card">로드 중...</div>;
  if (error) return <div className="card error-message">{error}</div>;
  if (!meeting) return <div className="card">회의를 찾을 수 없습니다.</div>;

  const participants = (meeting.participants || []).filter((p) => p.name && p.name.trim());
  const requiredNames = participants.filter((p) => p.isRequired).map((p) => p.name);
  const requiredCount = requiredNames.length;

  const meetingDates = [...new Set(timeSlots.map((s) => s.slot_date))].sort();
  const hours = [...new Set(timeSlots.map((s) => s.start_time))].sort();

  const slotByKey = {};
  timeSlots.forEach((s) => {
    slotByKey[`${s.slot_date}-${s.start_time}`] = s;
  });

  const respBySlot = {};
  responses.forEach((r) => {
    (respBySlot[r.time_slot_id] = respBySlot[r.time_slot_id] || []).push(r);
  });

  const respondedNames = new Set(responses.map((r) => r.participant_name));
  const respondedCount = participants.filter((p) => respondedNames.has(p.name)).length;

  const getCellInfo = (date, time) => {
    const slot = slotByKey[`${date}-${time}`];
    if (!slot) return null;
    const rs = respBySlot[slot.id] || [];
    const unavailable = rs.filter((r) => r.status === 'unavailable').map((r) => r.participant_name);
    const maybe = rs.filter((r) => r.status === 'maybe').map((r) => r.participant_name);
    const requiredUnavailable = unavailable.filter((n) => requiredNames.includes(n));
    return {
      slot,
      unavailable,
      maybe,
      requiredUnavailable,
      requiredAllOk: requiredUnavailable.length === 0,
    };
  };

  const columnCount = Math.min(MAX_COLUMNS, Math.max(MIN_COLUMNS, meetingDates.length));
  const lastDate = meetingDates[meetingDates.length - 1] || dayjs().format('YYYY-MM-DD');
  const columns = Array.from({ length: columnCount }, (_, i) => {
    if (i < meetingDates.length) return { date: meetingDates[i], active: true };
    return {
      date: dayjs(lastDate).add(i - meetingDates.length + 1, 'day').format('YYYY-MM-DD'),
      active: false,
    };
  });
  const gridTemplateColumns = `44px repeat(${columnCount}, minmax(0, 1fr))`;

  const heatClass = (info) => {
    if (!info) return '';
    if (info.unavailable.length > 0) {
      const n = info.unavailable.length;
      return n >= 3 ? 'heat-red-3' : n === 2 ? 'heat-red-2' : 'heat-red-1';
    }
    if (info.maybe.length > 0) return 'heat-maybe';
    return 'heat-free';
  };

  const fmtDate = (date) => `${dayjs(date).format('M월 D일')} (${WEEKDAYS[dayjs(date).day()]})`;
  const fmtRange = (info) => `${info.slot.start_time.slice(0, 5)}~${info.slot.end_time.slice(0, 5)}`;

  // 추천: 순위를 억지로 매기지 않고, '조건이 가장 좋은' 슬롯을 모두 표시
  const scored = meetingDates
    .flatMap((date) => hours.map((time) => ({ date, time, info: getCellInfo(date, time) })))
    .filter((c) => c.info)
    .map((c) => ({
      ...c,
      score:
        (c.info.requiredAllOk ? 1000 : 0) -
        c.info.unavailable.length * 100 -
        c.info.maybe.length * 10,
    }));
  const maxScore = scored.length ? Math.max(...scored.map((s) => s.score)) : 0;
  const recommendedKeys = new Set(
    responses.length > 0
      ? scored.filter((s) => s.score === maxScore && s.info.requiredAllOk).map((s) => `${s.date}-${s.time}`)
      : []
  );

  const selectedInfo = selectedCell ? getCellInfo(selectedCell.date, selectedCell.time) : null;
  const selectedRecommended =
    selectedCell && recommendedKeys.has(`${selectedCell.date}-${selectedCell.time}`);

  // 그리드 렌더 (mode: 'status' | 'rec')
  const renderGrid = (mode) => (
    <div className="org-grid">
      <div className="org-grid-header" style={{ gridTemplateColumns }}>
        <div className="org-corner" />
        {columns.map((col, idx) => (
          <div key={idx} className={`org-date-head ${col.active ? '' : 'inactive'}`}>
            <span className="org-dow">{WEEKDAYS[dayjs(col.date).day()]}</span>
            <span className="org-dnum">{dayjs(col.date).date()}</span>
          </div>
        ))}
      </div>

      <div className="org-grid-scroll">
        {hours.map((time) => (
          <div key={time} className="org-grid-row" style={{ gridTemplateColumns }}>
            <div className="org-time-label">{time.slice(0, 5)}</div>
            {columns.map((col, idx) => {
              if (!col.active) return <div key={idx} className="org-cell placeholder" />;
              const info = getCellInfo(col.date, time);
              const key = `${col.date}-${time}`;
              const isSel = selectedCell && selectedCell.date === col.date && selectedCell.time === time;

              let extra = '';
              let star = null;
              if (mode === 'status') {
                if (onlyRequired && info) extra = info.requiredAllOk ? 'req-ok' : 'dimmed';
              } else {
                // 추천 탭: 추천 슬롯은 별표, 나머지는 흐리게
                if (recommendedKeys.has(key)) {
                  extra = 'recommended';
                  star = <span className="rec-star">★</span>;
                } else {
                  extra = 'rec-dim';
                }
              }

              return (
                <div
                  key={idx}
                  className={`org-cell ${heatClass(info)} ${extra} ${isSel ? 'selected' : ''}`}
                  onClick={() => setSelectedCell(isSel ? null : { date: col.date, time })}
                >
                  {star}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="organizer-view">
      <button className="back-button" onClick={onBack}>
        ← 뒤로
      </button>

      <div className="card">
        {/* 헤더 (제목/응답수 세로 배치 + 가운데 정렬) */}
        <div className="org-header">
          <h2 className="org-title">{meeting.title}</h2>
          <span className="org-count">
            {participants.length}명 중 {respondedCount}명 응답
          </span>
        </div>

        {/* 탭 */}
        <div className="org-tabs">
          <button
            className={`org-tab ${tab === 'status' ? 'active' : ''}`}
            onClick={() => { setTab('status'); setSelectedCell(null); }}
          >
            응답 현황
          </button>
          <button
            className={`org-tab ${tab === 'rec' ? 'active' : ''}`}
            onClick={() => { setTab('rec'); setSelectedCell(null); }}
          >
            추천 시간
          </button>
        </div>

        {/* ── 응답 현황 탭 ── */}
        {tab === 'status' && (
          <>
            <p className="org-subtitle">색이 진할수록 안 되는 사람이 많아요</p>

            {requiredCount > 0 && (
              <button
                className={`org-filter ${onlyRequired ? 'on' : ''}`}
                onClick={() => setOnlyRequired((v) => !v)}
              >
                <span className={`org-switch ${onlyRequired ? 'on' : ''}`}>
                  <span className="org-knob" />
                </span>
                필참자 전원 가능한 시간만 강조
              </button>
            )}

            {renderGrid('status')}

            <div className="org-legend">
              <span className="lg"><i className="sw heat-free" />전원 가능</span>
              <span className="lg"><i className="sw heat-maybe" />회피 포함</span>
              <span className="lg"><i className="sw heat-red-2" />불가 포함</span>
              {onlyRequired && requiredCount > 0 && (
                <span className="lg"><i className="sw req-ok" />필참 전원 가능</span>
              )}
            </div>
          </>
        )}

        {/* ── 추천 시간 탭 ── */}
        {tab === 'rec' && (
          <>
            {responses.length === 0 ? (
              <p className="org-subtitle">아직 응답이 없어요. 참석자들이 응답하면 추천 시간이 표시됩니다.</p>
            ) : recommendedKeys.size === 0 ? (
              <p className="org-subtitle">필참자가 모두 가능한 시간이 없어요.</p>
            ) : (
              <p className="org-subtitle">
                ★ 표시가 조건이 가장 좋은 시간이에요 ({recommendedKeys.size}곳). 블록을 눌러 이유를 확인하세요.
              </p>
            )}
            {renderGrid('rec')}
          </>
        )}

        {/* 선택한 슬롯 상세 (익명, 명수만) */}
        {selectedInfo && (
          <div className="org-detail">
            <div className="org-detail-title">
              {selectedRecommended ? '★ ' : ''}
              {fmtDate(selectedCell.date)} · {fmtRange(selectedInfo)}
            </div>
            {selectedInfo.unavailable.length === 0 && selectedInfo.maybe.length === 0 ? (
              <p className="org-detail-line ok">모두 가능한 시간이에요 👍</p>
            ) : (
              <>
                {selectedInfo.unavailable.length > 0 && (
                  <p className="org-detail-line bad">
                    <span className="dot unavailable" /> 안 됨 {selectedInfo.unavailable.length}명
                    {requiredCount > 0 && selectedInfo.requiredUnavailable.length > 0
                      ? ` (필참 ${selectedInfo.requiredUnavailable.length}명 포함)`
                      : ''}
                  </p>
                )}
                {selectedInfo.maybe.length > 0 && (
                  <p className="org-detail-line warn">
                    <span className="dot maybe" /> 피하고 싶음 {selectedInfo.maybe.length}명
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
