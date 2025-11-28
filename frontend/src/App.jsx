import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, getRedirectResult } from 'firebase/auth';
import { auth } from './services/firebase';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import FeedPage from './pages/FeedPage';
import MyClasses from './pages/MyClasses';
import AIPage from './pages/AIPage';
import AIChatPopup from './components/features/AIChatPopup';
import VoiceChatMiniPopup from './components/features/VoiceChatMiniPopup';
import { VoiceChatProvider, useVoiceChat } from './contexts/VoiceChatContext';
import ExamCreator from './pages/ExamCreator';
import ExamRunner from './pages/ExamRunner';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('dashboard');
  const [subView, setSubView] = useState(null);
  const [activeExam, setActiveExam] = useState(null);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [liveModeState, setLiveModeState] = useState(null);
  
  // Quan trọng: Thay thế bằng API Key của bạn (nếu không dùng backend)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || ""; 
  const appId = import.meta.env.VITE_APP_ID || "default-app-id";

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    // Xử lý redirect result nếu có (khi dùng signInWithRedirect)
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // Xóa redirect URL đã lưu
          sessionStorage.removeItem('auth_redirect');
        }
      } catch (error) {
        // Ignore redirect errors
      }
    };

    handleRedirectResult();

    // Lắng nghe thay đổi auth state
    const unsub = onAuthStateChanged(auth, u => {
      if (u) { 
        setUser(u); 
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Responsive sidebar logic
  useEffect(() => {
    const resize = () => {
      if(window.innerWidth >= 1024) setLeftSidebarOpen(true);
      if(window.innerWidth < 1280) setRightSidebarOpen(false);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 rounded-full animate-spin border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Show login page if user is not authenticated
  if (!user) {
    return <LoginPage />;
  }

  // Routing Logic
  if (subView === 'take_exam' && activeExam) {
    return <ExamRunner exam={activeExam} user={user} appId={appId} onExit={() => setSubView(null)} />;
  }

  let content;
  if (subView === 'create_exam') {
    content = <ExamCreator user={user} classId="demo-class" apiKey={apiKey} appId={appId} onBack={() => setSubView(null)} />;
  } else if (view === 'ai_chat') {
    content = <AIPage 
      apiKey={apiKey} 
      user={user} 
      onLiveModeChange={(isLive, state) => {
        if (isLive) {
          setLiveModeState(state);
        } else {
          setLiveModeState(null);
        }
      }}
    />;
  } else if (view === 'my_classes') {
    content = <MyClasses user={user} appId={appId} />;
  } else if (view === 'dashboard') {
    content = <FeedPage user={user} appId={appId} />;
  } else if (view === 'exam_bank') {
    content = (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">Ngân hàng đề</h1>
        <button onClick={()=>setSubView('create_exam')} className="bg-blue-600 text-white px-4 py-2 rounded">Tạo đề mới</button>
        <div className="mt-4 grid gap-4">
          {[1,2].map(i => (
            <div key={i} className="p-4 border rounded bg-white shadow-sm flex justify-between">
              <span>Đề thi mẫu #{i}</span>
              <button onClick={()=>{setActiveExam({id:i, title:`Đề mẫu ${i}`, duration:45, questions:[]}); setSubView('take_exam')}} className="text-blue-600">Làm bài</button>
            </div>
          ))}
        </div>
      </div>
    );
  } else {
    content = <div className="p-10 text-center text-gray-400">Tính năng đang phát triển</div>;
  }

  return (
    <VoiceChatProvider>
      <MainLayout 
        user={user}
        leftSidebarOpen={leftSidebarOpen} setLeftSidebarOpen={setLeftSidebarOpen}
        rightSidebarOpen={rightSidebarOpen} setRightSidebarOpen={setRightSidebarOpen}
        view={view} setView={setView} activeView={view}
        toggleAI={() => setShowAI(!showAI)}
        liveModeState={liveModeState}
      >
        {content}
      </MainLayout>
      {showAI && (
        <AIChatPopup 
          apiKey={apiKey} 
          user={user} 
          onClose={() => {
            // Chỉ đóng popup, voice chat sẽ tiếp tục nếu đang active
            setShowAI(false);
          }} 
        />
      )}
      <VoiceChatMiniPopup 
        onOpenFullPopup={() => setShowAI(true)}
        onStopRecording={() => {
          // Stop recording được xử lý trong context
        }}
      />
    </VoiceChatProvider>
  );
}

