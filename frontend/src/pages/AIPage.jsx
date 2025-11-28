import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bot } from 'lucide-react';
import LivePillHeader from '../components/features/ai/LivePillHeader';
import LivePanel from '../components/features/ai/LivePanel';
import ChatHeader from '../components/features/ai/ChatHeader';
import MessageItem from '../components/features/ai/MessageItem';
import ThinkingIndicator from '../components/features/ai/ThinkingIndicator';
import ChatInput from '../components/features/ai/ChatInput';
import { useVoiceRecognition } from '../hooks/useVoiceRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { sendChatMessage } from '../services/aiChatService';
import { saveMessage, saveConversation, loadChatHistory, cleanupExpiredMessages } from '../services/chatHistoryService';
import { AI_PERSONA } from '../config/aiConfig';

const AIPage = ({ apiKey, user, onLiveModeChange }) => {
  const appId = import.meta.env.VITE_APP_ID || 'default-app-id';
  
  // State quản lý
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  
  // Live Mode States
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  
  // Refs
  const messagesEndRef = useRef(null);
  
  // Voice hooks
  const { speak, stop, synthesisRef } = useTextToSpeech();
  
  // Load chat history khi component mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!user?.uid) {
        // Nếu chưa có user, hiển thị welcome message
        setMessages([{ 
          id: 'welcome', 
          role: 'ai', 
          content: AI_PERSONA.greeting,
          timestamp: new Date()
        }]);
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      try {
        // Cleanup messages cũ trước
        await cleanupExpiredMessages(user.uid, appId);
        
        // Load lịch sử
        const history = await loadChatHistory(user.uid, appId, 50);
        
        if (history.length > 0) {
          // Có lịch sử - load lại
          setMessages(history);
        } else {
          // Không có lịch sử - hiển thị welcome message
          const welcomeMsg = { 
            id: 'welcome', 
            role: 'ai', 
            content: AI_PERSONA.greeting,
            timestamp: new Date()
          };
          setMessages([welcomeMsg]);
          // Lưu welcome message
          await saveMessage(user.uid, welcomeMsg, appId);
        }
      } catch (error) {
        // Fallback to welcome message
        setMessages([{ 
          id: 'welcome', 
          role: 'ai', 
          content: AI_PERSONA.greeting 
        }]);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [user?.uid, appId]);

  const { isListening, toggleListening } = useVoiceRecognition(
    isLiveMode,
    (transcript) => {
      if (transcript) {
        handleSendMessage(transcript);
      }
    },
    synthesisRef
  );

  // Logic gọi API
  const handleSendMessage = async (text) => {
    if (!text) return;

    // 1. UI User Msg
    const userMsg = { 
      id: Date.now(), 
      role: 'user', 
      content: text,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    
    // Lưu user message vào database
    if (user?.uid) {
      await saveMessage(user.uid, userMsg, appId);
    }
    
    setIsThinking(true);

    try {
      // 2. Call Real API
      const aiContent = await sendChatMessage(text, user?.uid);
      
      // 3. UI AI Msg
      const aiMsg = { 
        id: Date.now() + 1, 
        role: 'ai', 
        content: aiContent,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
      
      // Lưu AI message vào database
      if (user?.uid) {
        await saveMessage(user.uid, aiMsg, appId);
      }
      
      // 4. TTS if Live
      if (isLiveMode) {
        speak(aiContent);
      }
    } catch (error) {
      const errorMsg = { 
        id: Date.now(), 
        role: 'ai', 
        content: "Xin lỗi, tớ đang bị mất kết nối.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
      
      // Lưu error message
      if (user?.uid) {
        await saveMessage(user.uid, errorMsg, appId);
      }
    } finally {
      setIsThinking(false);
    }
  };

  const handleToggleLive = useCallback(() => {
    const newMode = !isLiveMode;
    setIsLiveMode(newMode);
    
    if (newMode) {
      setTimeout(() => toggleListening(), 500);
    } else {
      stop();
      // isListening sẽ tự động được cập nhật bởi hook useVoiceRecognition
    }
  }, [isLiveMode, toggleListening, stop]);

  // Cập nhật live mode state khi có thay đổi
  useEffect(() => {
    if (onLiveModeChange) {
      onLiveModeChange(isLiveMode, {
        sessionTime,
        isListening,
        toggleListening,
        turnOffLive: handleToggleLive
      });
    }
  }, [isLiveMode, sessionTime, isListening, toggleListening, handleToggleLive, onLiveModeChange]);

  // Timer
  useEffect(() => {
    let interval;
    if (isLiveMode) {
      interval = setInterval(() => setSessionTime(t => t + 1), 1000);
    } else {
      setSessionTime(0);
    }
    return () => clearInterval(interval);
  }, [isLiveMode]);

  // Auto Scroll
  useEffect(() => { 
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, isThinking]);

  // Không thay thế toàn bộ giao diện khi live mode trên desktop
  // Popup sẽ được hiển thị trên LeftSidebar thay vì

  // Giao diện Chat Tiêu Chuẩn (+ Mobile Live Pill)
  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* MOBILE LIVE HEADER */}
      {isLiveMode && typeof window !== 'undefined' && window.innerWidth < 1024 && (
        <LivePillHeader 
          sessionTime={sessionTime} 
          isListening={isListening} 
          toggleListening={toggleListening} 
          turnOffLive={handleToggleLive}
        />
      )}

      {/* CHAT HEADER */}
      {(!isLiveMode || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
        <ChatHeader 
          isLiveMode={isLiveMode}
          onToggleLive={handleToggleLive}
        />
      )}

      {/* MESSAGES LIST */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-gradient-to-b from-white to-gray-50">
        {isLoadingHistory ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 space-y-4">
            <Bot size={48} className="text-gray-200 animate-pulse" />
            <p>Đang tải lịch sử chat...</p>
          </div>
        ) : messages.length === 0 && !isThinking ? (
          <div className="flex h-full flex-col items-center justify-center text-gray-400 space-y-4">
            <Bot size={48} className="text-gray-200" />
            <p>Bắt đầu trò chuyện với {AI_PERSONA.name} ngay!</p>
          </div>
        ) : null}
        
        {messages.map((msg) => (
          <MessageItem 
            key={msg.id} 
            message={msg} 
            user={user}
          />
        ))}
        
        {isThinking && <ThinkingIndicator />}
        
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA: QUAN TRỌNG - Giữ hiển thị input ngay cả khi live mode bật trên mobile */}
      <ChatInput 
        input={input}
        setInput={setInput}
        onSend={handleSendMessage}
        onToggleLive={handleToggleLive}
        isLiveMode={isLiveMode}
      />
    </div>
  );
};

export default AIPage;
