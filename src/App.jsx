import { useState, useEffect } from 'react';
import './App.css';
import './styles/globals.css';
import './styles/create-meeting.css';
import './styles/participant-form.css';
import './styles/organizer.css';
import CreateMeeting from './pages/CreateMeeting';
import ParticipantForm from './pages/ParticipantForm';
import OrganizerView from './pages/OrganizerView';

function App() {
  const [page, setPage] = useState('home');
  const [shareLink, setShareLink] = useState(null);
  const [joinInput, setJoinInput] = useState('');

  const openMeeting = (link) => {
    setShareLink(link);
    setPage('participant');
  };

  useEffect(() => {
    // 공유 링크는 하나: /meeting/[link] 로 들어오면 참석자 화면
    const path = window.location.pathname;
    if (path.includes('/meeting/')) {
      const link = path.split('/meeting/')[1];
      if (link && link.trim()) {
        setShareLink(link.trim());
        setPage('participant');
      }
    }
  }, [window.location.pathname]);

  // 입력창에 붙여넣은 값에서 회의 코드만 추출 (전체 URL이든 코드만이든 처리)
  const handleJoin = () => {
    const raw = joinInput.trim();
    if (!raw) return;
    const link = raw.includes('/meeting/') ? raw.split('/meeting/')[1].split(/[/?#]/)[0] : raw;
    if (link) openMeeting(link);
  };

  return (
    <div className="app">
      <header className={`app-header ${page !== 'home' ? 'header-hidden-mobile' : ''}`}>
        <h1 className="app-title">회의 일정 조율</h1>
        <p className="app-subtitle">모두가 참석 가능한 시간을 함께 찾아봅시다</p>
      </header>

      <main className="app-main">
        {page === 'home' && (
          <div className="home-page">
            <div className="card">
              <h2>새 회의 만들기</h2>
              <p className="text-sm" style={{ marginBottom: '16px' }}>
                참석자들과 함께 가능한 시간을 찾아보세요
              </p>
              <button className="btn btn-primary" onClick={() => setPage('create')}>
                회의 만들기
              </button>
            </div>

            <div className="card" style={{ marginTop: '16px' }}>
              <h2>기존 회의 열기</h2>
              <p className="text-sm" style={{ marginBottom: '16px' }}>
                공유받은 링크로 참여하거나 응답 현황을 확인하세요
              </p>
              <input
                type="text"
                placeholder="공유 링크 붙여넣기"
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value)}
                style={{ marginBottom: '12px' }}
              />
              <button className="btn btn-secondary" onClick={handleJoin}>
                열기
              </button>
            </div>
          </div>
        )}

        {page === 'create' && (
          <div className="create-page">
            <CreateMeeting
              onSuccess={() => setPage('home')}
              onBack={() => setPage('home')}
              onViewResult={(link) => {
                setShareLink(link);
                setPage('organizer');
              }}
            />
          </div>
        )}

        {page === 'participant' && shareLink && (
          <div className="participant-page">
            <ParticipantForm
              shareLink={shareLink}
              onBack={() => setPage('home')}
              onViewResult={() => setPage('organizer')}
            />
          </div>
        )}

        {page === 'organizer' && shareLink && (
          <div className="participant-page">
            <OrganizerView shareLink={shareLink} onBack={() => setPage('participant')} />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>© 2026 회의 일정 조율 - Supabase + React + Vite</p>
      </footer>
    </div>
  );
}

export default App;
