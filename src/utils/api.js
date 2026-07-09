import { supabase } from '../config/supabase';

// 회의 생성
export async function createMeeting(meetingData) {
  try {
    const shareLink = generateShareLink();
    const { data, error } = await supabase
      .from('meetings')
      .insert([
        {
          ...meetingData,
          share_link: shareLink,
        },
      ])
      .select();

    if (error) throw error;
    return { success: true, data: data[0] };
  } catch (error) {
    console.error('회의 생성 실패:', error);
    return { success: false, error: error.message };
  }
}

// 공유 링크로 회의 조회
export async function getMeetingByLink(shareLink) {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('share_link', shareLink)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('회의 조회 실패:', error);
    return { success: false, error: error.message };
  }
}

// 시간 슬롯 생성
export async function createTimeSlots(meetingId, slots) {
  try {
    const { data, error } = await supabase
      .from('time_slots')
      .insert(
        slots.map((slot) => ({
          meeting_id: meetingId,
          slot_date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
        }))
      )
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('시간 슬롯 생성 실패:', error);
    return { success: false, error: error.message };
  }
}

// 시간 슬롯 조회
export async function getTimeSlots(meetingId) {
  try {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('meeting_id', meetingId)
      .order('slot_date', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('시간 슬롯 조회 실패:', error);
    return { success: false, error: error.message };
  }
}

// 참석자 응답 저장
export async function saveParticipantResponse(meetingId, timeSlotId, participantName, status) {
  try {
    const { data, error } = await supabase
      .from('participant_responses')
      .upsert(
        [
          {
            meeting_id: meetingId,
            time_slot_id: timeSlotId,
            participant_name: participantName,
            status: status,
          },
        ],
        { onConflict: 'meeting_id,time_slot_id,participant_name' }
      )
      .select();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('참석자 응답 저장 실패:', error);
    return { success: false, error: error.message };
  }
}

// 회의의 모든 응답 조회
export async function getMeetingResponses(meetingId) {
  try {
    const { data, error } = await supabase
      .from('participant_responses')
      .select('*')
      .eq('meeting_id', meetingId);

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('응답 조회 실패:', error);
    return { success: false, error: error.message };
  }
}

// 공유 링크 생성 (8자리 영숫자)
function generateShareLink() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let link = '';
  for (let i = 0; i < 8; i++) {
    link += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return link;
}

// 추천 시간 슬롯 계산
export function calculateRecommendedSlots(timeSlots, responses, requiredParticipants) {
  const slotScores = timeSlots.map((slot) => {
    const slotResponses = responses.filter((r) => r.time_slot_id === slot.id);
    const availableCount = slotResponses.filter((r) => r.status === 'available').length;
    const unavailableCount = slotResponses.filter((r) => r.status === 'unavailable').length;

    return {
      slotId: slot.id,
      slot: slot,
      availableCount,
      unavailableCount,
      allAvailable: availableCount === requiredParticipants.length,
      score: availableCount * 10 - unavailableCount * 5,
    };
  });

  return slotScores.sort((a, b) => b.score - a.score);
}
