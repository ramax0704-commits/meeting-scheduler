import { useState } from 'react';
import './App.css';
import './styles/globals.css';
import './styles/create-meeting.css';
import CreateMeeting from './pages/CreateMeeting';

function App() {
  const [page, setPage] = useState('home'); // home, create, view

  return (
    <div className="app">
      <header className="app-header">
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
              <h2>기존 회의 참가</h2>
              <p className="text-sm" style={{ marginBottom: '16px' }}>
                공유받은 링크로 참가하세요
              </p>
              <input
                type="text"
                placeholder="공유 링크 입력"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #EFEFEF',
                  borderRadius: '12px',
                  marginBottom: '12px',
                }}
              />
              <button className="btn btn-secondary" onClick={() => setPage('view')}>
                참가하기
              </button>
            </div>
          </div>
        )}

        {page === 'create' && (
          <div className="create-page">
            <CreateMeeting onSuccess={() => setPage('home')} onBack={() => setPage('home')} />
          </div>
        )}

        {page === 'view' && (
          <div className="view-page">
            <button
              className="btn btn-secondary"
              onClick={() => setPage('home')}
              style={{ marginBottom: '16px' }}
            >
              ← 돌아가기
            </button>
            <div className="card">
              <h2>회의 참가</h2>
              <p className="text-sm">이 섹션은 개발 예정입니다.</p>
            </div>
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
