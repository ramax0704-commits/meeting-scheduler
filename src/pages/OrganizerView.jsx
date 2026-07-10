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

  const [onlyRequired, setOnlyRequired] = useState(false); // 필참 전원 가능만 강조
  const [selectedCell, setSelectedCell] = useState(null); // 탭한 셀 상세 {date, time}

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

  // 날짜+시간 → 슬롯
  const slotByKey = {};
  timeSlots.forEach((s) => {
    slotByKey[`${s.slot_date}-${s.start_time}`] = s;
  });

  // 슬롯별 응답 모으기
  const respBySlot = {};
  responses.forEach((r) => {
    (respBySlot[r.time_slot_id] = respBySlot[r.time_slot_id] || []).push(r);
  });

  const respondedNames = new Set(responses.map((r) => r.participant_name));
  const respondedCount = participants.filter((p) => respondedNames.has(p.name)).length;

  // 한 슬롯의 집계 정보
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

  // 그리드 열 (선택된 날짜 + 최소 5칸 채움)
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
  const fmtRange = (info) =>
    `${info.slot.start_time.slice(0, 5)}~${info.slot.end_time.slice(0, 5)}`;

  // 추천 시간 (조건 만족순 상위 3개)
  const recommendations = meetingDates
    .flatMap((date) => hours.map((time) => ({ date, time, info: getCellInfo(date, time) })))
    .filter((c) => c.info)
    .map((c) => ({
      ...c,
      score:
        (c.info.requiredAllOk ? 10000 : 0) -
        c.info.unavailable.length * 100 -
        c.info.maybe.length * 10,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const selectedInfo = selectedCell ? getCellInfo(selectedCell.date, selectedCell.time) : null;

  return (
    <div className="organizer-view">
      <button className="back-button" onClick={onBack}>
        ← 뒤로
      </button>

      <div className="card">
        {/* 헤더 */}
        <div className="org-header">
          <div className="org-title-row">
            <h2 className="org-title">{meeting.title}</h2>
            <span className="org-count">
              {participants.length}명 중 {respondedCount}명 응답
            </span>
          </div>
          <p className="org-subtitle">색이 진할수록 안 되는 사람이 많아요</p>
        </div>

        {/* 필참 전원 가능 강조 토글 */}
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

        {/* 히트맵 그리드 */}
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
                  const isSel =
                    selectedCell && selectedCell.date === col.date && selectedCell.time === time;
                  const reqBorder = onlyRequired && info && info.requiredAllOk;
                  const dimmed = onlyRequired && info && !info.requiredAllOk;
                  return (
                    <div
                      key={idx}
                      className={`org-cell ${heatClass(info)} ${reqBorder ? 'req-ok' : ''} ${dimmed ? 'dimmed' : ''} ${isSel ? 'selected' : ''}`}
                      onClick={() => setSelectedCell(isSel ? null : { date: col.date, time })}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 범례 */}
        <div className="org-legend">
          <span className="lg"><i className="sw heat-free" />전원 가능</span>
          <span className="lg"><i className="sw heat-maybe" />회피 포함</span>
          <span className="lg"><i className="sw heat-red-2" />불가 포함</span>
          <span className="lg"><i className="sw req-ok" />필참 전원 가능</span>
        </div>

        {/* 선택한 슬롯 상세 */}
        {selectedInfo && (
          <div className="org-detail">
            <div className="org-detail-title">
              {fmtDate(selectedCell.date)} · {fmtRange(selectedInfo)}
            </div>
            {selectedInfo.unavailable.length === 0 && selectedInfo.maybe.length === 0 ? (
              <p className="org-detail-line ok">모두 가능한 시간이에요 👍</p>
            ) : (
              <>
                {selectedInfo.unavailable.length > 0 && (
                  <p className="org-detail-line bad">
                    <span className="dot unavailable" /> 안 됨: {selectedInfo.unavailable.join(', ')}
                  </p>
                )}
                {selectedInfo.maybe.length > 0 && (
                  <p className="org-detail-line warn">
                    <span className="dot maybe" /> 피하고 싶음: {selectedInfo.maybe.join(', ')}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 추천 시간 */}
      <div className="card org-rec-card">
        <h3>추천 시간</h3>
        <p className="org-rec-sub">조건을 가장 잘 만족하는 순서예요</p>

        {responses.length === 0 ? (
          <p className="text-sm">아직 응답이 없어요. 참석자들이 응답하면 추천이 표시됩니다.</p>
        ) : (
          <div className="rec-list">
            {recommendations.map((r, i) => {
              const { info } = r;
              return (
                <div key={`${r.date}-${r.time}`} className={`rec-card ${i === 0 ? 'top' : ''}`}>
                  <div className="rec-head">
                    <span className="rec-time">
                      {fmtDate(r.date)} · {fmtRange(info)}
                    </span>
                    <span className="rec-rank">{i + 1}순위</span>
                  </div>
                  <ul className="rec-reasons">
                    {requiredCount > 0 && (
                      <li className={info.requiredAllOk ? 'ok' : 'warn'}>
                        {info.requiredAllOk
                          ? `필참 ${requiredCount}명 전원 가능`
                          : `필참 ${info.requiredUnavailable.length}명 불가 (${info.requiredUnavailable.join(', ')})`}
                      </li>
                    )}
                    <li className={info.unavailable.length === 0 ? 'ok' : 'warn'}>
                      {info.unavailable.length === 0
                        ? '안 되는 사람 0명'
                        : `안 되는 사람 ${info.unavailable.length}명 (${info.unavailable.join(', ')})`}
                    </li>
                    <li className={info.maybe.length === 0 ? 'ok' : 'warn'}>
                      {info.maybe.length === 0
                        ? '피하고 싶은 사람 0명'
                        : `피하고 싶은 사람 ${info.maybe.length}명 (${info.maybe.join(', ')})`}
                    </li>
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
