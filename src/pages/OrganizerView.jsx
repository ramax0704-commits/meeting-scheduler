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
  const [timePref, setTimePref] = useState('any'); // 추천 시간대 선호: any | morning | afternoon

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

  // 시간대 선호 점수 (조율자가 결과 화면에서 선택: 오전/오후/상관없음)
  const timeBonus = (startTime) => {
    const h = parseInt(startTime.slice(0, 2), 10);
    if (timePref === 'morning') {
      if (h >= 9 && h <= 11) return 20; // 오전 선호
      if (h === 12) return -5; // 점심
      if (h >= 13) return -10; // 오후 감점
      return 5; // 이른 아침
    }
    if (timePref === 'afternoon') {
      if (h >= 13 && h <= 16) return 20; // 오후 선호
      if (h === 17) return 5;
      if (h === 12) return -5; // 점심
      return -10; // 오전 감점
    }
    // 상관없음: 큰 편향은 없지만 동점일 때 오후를 오전보다 살짝 우선
    if (h >= 13 && h <= 16) return 5;
    return 0;
  };
  const timeLabel = (startTime) => {
    const h = parseInt(startTime.slice(0, 2), 10);
    if (h >= 13 && h <= 16) return '오후 시간대';
    if (h >= 10 && h <= 11) return '오전 시간대';
    if (h === 12) return '점심 시간대';
    if (h >= 17) return '늦은 시간대';
    return '이른 시간대';
  };

  // 추천: 필참 전원 가능한 시간만 후보 → 점수순 → 하루 최대 2개로 분산 → 상위 5개
  let recommendations = [];
  if (responses.length > 0) {
    const candidates = meetingDates
      .flatMap((date) => hours.map((time) => ({ date, time, info: getCellInfo(date, time) })))
      .filter((c) => c.info && c.info.requiredAllOk)
      .map((c) => ({
        ...c,
        recScore: -c.info.unavailable.length * 100 - c.info.maybe.length * 25 + timeBonus(c.time),
      }))
      .sort(
        (a, b) => b.recScore - a.recScore || (a.date + a.time).localeCompare(b.date + b.time)
      );

    const perDay = {};
    const picked = [];
    for (const c of candidates) {
      if (picked.length >= 5) break;
      if ((perDay[c.date] || 0) >= 2) continue; // 하루 최대 2개
      perDay[c.date] = (perDay[c.date] || 0) + 1;
      picked.push(c);
    }
    for (const c of candidates) {
      if (picked.length >= 5) break;
      if (!picked.includes(c)) picked.push(c);
    }
    recommendations = picked.map((c, i) => ({ ...c, rank: i + 1 }));
  }

  const recRankByKey = {};
  recommendations.forEach((r) => {
    recRankByKey[`${r.date}-${r.time}`] = r.rank;
  });

  // 추천 탭에서는 아무것도 안 눌렀을 때 기본으로 1순위를 보여준다
  const rank1 = recommendations[0];
  const activeCell =
    selectedCell || (tab === 'rec' && rank1 ? { date: rank1.date, time: rank1.time } : null);
  const selectedInfo = activeCell ? getCellInfo(activeCell.date, activeCell.time) : null;
  const selectedRank = activeCell ? recRankByKey[`${activeCell.date}-${activeCell.time}`] : undefined;

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
              const isSel = activeCell && activeCell.date === col.date && activeCell.time === time;

              let extra = '';
              let badge = null;
              if (mode === 'status') {
                if (onlyRequired && info) extra = info.requiredAllOk ? 'req-ok' : 'dimmed';
              } else {
                // 추천 탭: 추천 슬롯은 순위 번호, 나머지는 흐리게
                const rank = recRankByKey[key];
                if (rank) {
                  extra = 'recommended';
                  badge = <span className="rec-rank-badge">{rank}</span>;
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
                  {badge}
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
            ) : recommendations.length === 0 ? (
              <p className="org-subtitle">필참자가 모두 가능한 시간이 없어요.</p>
            ) : (
              <p className="org-subtitle">
                필참자가 가능한 시간 중 좋은 순으로 최대 5곳이에요. 번호를 눌러 이유를 확인하세요.
              </p>
            )}

            {responses.length > 0 && (
              <div className="org-timepref">
                <span className="org-timepref-label">시간대 선호</span>
                <div className="org-seg">
                  {[
                    { v: 'morning', t: '오전' },
                    { v: 'afternoon', t: '오후' },
                    { v: 'any', t: '상관없음' },
                  ].map((o) => (
                    <button
                      key={o.v}
                      className={timePref === o.v ? 'active' : ''}
                      onClick={() => {
                        setTimePref(o.v);
                        setSelectedCell(null);
                      }}
                    >
                      {o.t}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {renderGrid('rec')}
          </>
        )}

        {/* 선택한 슬롯 상세 (익명, 명수만) */}
        {selectedInfo && (
          <div className="org-detail">
            <div className="org-detail-title">
              {selectedRank && <span className="org-rank-chip">{selectedRank}순위</span>}
              {fmtDate(activeCell.date)} · {fmtRange(selectedInfo)}
            </div>

            {selectedRank ? (
              <>
                {requiredCount > 0 && (
                  <p className="org-detail-line ok">✓ 필참 {requiredCount}명 전원 가능</p>
                )}
                {selectedInfo.unavailable.length === 0 && selectedInfo.maybe.length === 0 ? (
                  <p className="org-detail-line ok">✓ 전원 참석 가능</p>
                ) : (
                  <>
                    {selectedInfo.unavailable.length > 0 && (
                      <p className="org-detail-line warn">⚠ 선택 인원 {selectedInfo.unavailable.length}명 불가</p>
                    )}
                    {selectedInfo.maybe.length > 0 && (
                      <p className="org-detail-line warn">⚠ 피하고 싶은 사람 {selectedInfo.maybe.length}명</p>
                    )}
                  </>
                )}
                <p className="org-detail-line muted">🕐 {timeLabel(activeCell.time)}</p>
              </>
            ) : selectedInfo.unavailable.length === 0 && selectedInfo.maybe.length === 0 ? (
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
