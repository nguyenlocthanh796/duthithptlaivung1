import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';

import { useAuth } from '../hooks/useAuth';

import { ThreeColumnLayout } from '../components/ThreeColumnLayout';

import { db } from '../firebase';

import {

  collection,

  addDoc,

  onSnapshot,

  serverTimestamp,

  deleteDoc,

  doc,

  query,

  where,

  orderBy,

  getDoc,

  updateDoc,

} from 'firebase/firestore';

import {

  Send,

  Image as ImageIcon,

  Mic,

  Sparkles,

  Calculator,

  BookOpen,

  X,

  MicOff,

  Smile,

  Headphones,

  Menu,

  MessageSquare,

  Trash2,

  Plus,

  Clock

} from 'lucide-react';

import { callGeminiMultimodal } from '../services/chatService';

import { renderTextWithLatex } from '../utils/latexRenderer';



// =================================================================

// 1. CSS STYLES (Tích hợp sẵn để tránh lỗi thiếu file)

// =================================================================

const cssStyles = `

  .material-btn-icon {

    background: transparent;

    border: none;

    cursor: pointer;

    width: 48px;

    height: 48px;

    border-radius: 50%;

    display: flex;

    align-items: center;

    justify-content: center;

    transition: background-color 0.2s ease;

    color: #444746;

    -webkit-tap-highlight-color: transparent;

  }

  .material-btn-icon:hover {

    background-color: rgba(68, 71, 70, 0.08);

  }

  .material-btn-icon:active {

    background-color: rgba(68, 71, 70, 0.12);

  }

  .nav-item {

    display: flex;

    align-items: center;

    padding: 12px 24px;

    text-decoration: none;

    color: #444746;

    font-weight: 500;

    margin: 4px 12px;

    border-radius: 24px;

    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

    transition: background 0.2s;

    cursor: pointer;

    border: none;

    background: transparent;

    width: calc(100% - 24px);

    text-align: left;

    white-space: nowrap;

    overflow: hidden;

  }

  .nav-item:hover {

    background-color: #f2f2f2;

  }

  .nav-item.active {

    background-color: #c2e7ff;

    color: #001d35;

  }

  .session-item {

    display: flex;

    align-items: center;

    padding: 12px 16px;

    margin: 4px 12px;

    border-radius: 24px;

    transition: background 0.2s;

    cursor: pointer;

    border: none;

    background: transparent;

    width: calc(100% - 24px);

    text-align: left;

    color: #444746;

    font-size: 14px;

  }

  .session-item:hover {

    background-color: #f2f2f2;

  }

  .session-item.active {

    background-color: #c2e7ff;

    color: #001d35;

    font-weight: 500;

  }

  /* Animation cho visualizer */

  @keyframes bounce {

    0%, 100% { transform: scaleY(1); }

    50% { transform: scaleY(2.5); }

  }

`;



// =================================================================

// 2. UTILS & COMPONENTS

// =================================================================



const floatTo16BitPCM = (float32Array) => {

  const buffer = new ArrayBuffer(float32Array.length * 2);

  const view = new DataView(buffer);

  let offset = 0;

  for (let i = 0; i < float32Array.length; i++, offset += 2) {

    let s = Math.max(-1, Math.min(1, float32Array[i]));

    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);

  }

  return new Int8Array(buffer);

};



const base64ToFloat32 = (base64) => {

  const binaryString = window.atob(base64);

  const len = binaryString.length;

  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {

    bytes[i] = binaryString.charCodeAt(i);

  }

  const int16Array = new Int16Array(bytes.buffer);

  const float32Array = new Float32Array(int16Array.length);

  for (let i = 0; i < int16Array.length; i++) {

    float32Array[i] = int16Array[i] / 32768.0;

  }

  return float32Array;

};



const AudioVisualizer = ({ isActive, role = 'user' }) => {

  return (

    <div className="flex items-center gap-0.5 h-3 md:h-4">

      {[...Array(5)].map((_, i) => (

        <div

          key={i}

          className={`w-0.5 md:w-1 rounded-full transition-all duration-100 ${

            role === 'user' ? 'bg-blue-500' : 'bg-pink-500'

          }`}

          style={{

            height: isActive ? `${Math.random() * 10 + 4}px` : '3px',

            animation: isActive ? `bounce 0.5s infinite ${i * 0.1}s` : 'none'

          }}

        ></div>

      ))}

    </div>

  );

};



const MascotFace = ({ status, volumeLevel = 0 }) => {

  const getColors = () => {

    switch (status) {

      case 'listening': return 'bg-blue-400';

      case 'speaking': return 'bg-pink-400';

      case 'connecting': return 'bg-gray-300';

      default: return 'bg-gray-200';

    }

  };



  const containerClass = 'w-9 h-9 md:w-11 md:h-11';

  const faceClass = 'w-5 h-5 md:w-6 md:h-6';

  const mouthHeight = status === 'speaking' ? Math.max(2, Math.min(8, volumeLevel * 6)) : 2;



  return (

    <div className={`${containerClass} shrink-0 rounded-full ${getColors()} flex items-center justify-center transition-all duration-300 shadow-sm ring-1 md:ring-2 ring-white relative z-10`}>

      <div className={`relative ${faceClass} bg-white rounded-full flex items-center justify-center overflow-hidden`}>

        <div className={`absolute left-1.5 top-2 w-0.5 h-1.5 bg-gray-900 rounded-full transition-all ${status === 'listening' ? 'h-2' : ''}`}></div>

        <div className={`absolute right-1.5 top-2 w-0.5 h-1.5 bg-gray-900 rounded-full transition-all ${status === 'listening' ? 'h-2' : ''}`}></div>

        <div className="absolute bottom-1.5 w-2.5 md:w-3 bg-gray-900 rounded-full transition-all duration-75" style={{ height: `${mouthHeight}px`, borderRadius: status === 'speaking' ? '50%' : '4px' }}></div>

      </div>

      {status === 'listening' && (

        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full animate-pulse"></div>

      )}

    </div>

  );

};



// --- LIVE CHAT HOOK ---

const useGeminiLive = (currentContext) => {

  // URL Backend Proxy - Tự động chọn giữa local và production
  // Lấy từ VITE_API_BASE_URL và chuyển đổi http/https -> ws/wss
  const getWebSocketURL = () => {
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    // Chuyển đổi http -> ws, https -> wss
    const wsBaseUrl = apiBaseUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
    return `${wsBaseUrl}/v1/live`;
  };

  const WS_URL = getWebSocketURL(); 



  const [status, setStatus] = useState('disconnected');

  const [liveState, setLiveState] = useState('idle');

  const [audioLevel, setAudioLevel] = useState(0);

  const [duration, setDuration] = useState(0);

  const [moodMessage, setMoodMessage] = useState("Sẵn sàng! 👋");



  const wsRef = useRef(null);

  const audioContextRef = useRef(null);

  const workletNodeRef = useRef(null);

  const streamRef = useRef(null);

  const nextStartTimeRef = useRef(0);



  const idleThoughts = useMemo(() => ["Học gì nhỉ? 🤔", "Đang nghe... 👂", "Cố lên! 💪", "Khó không? 📚", "Trời đẹp! ☀️", "Sẵn sàng? 🚀"], []);



  useEffect(() => {

    let moodInterval;

    if (liveState === 'idle' && status === 'connected') {

        moodInterval = setInterval(() => {

            const randomThought = idleThoughts[Math.floor(Math.random() * idleThoughts.length)];

            setMoodMessage(randomThought);

        }, 5000);

    } else if (liveState === 'listening') { setMoodMessage("Đang nghe... 👂");

    } else if (liveState === 'processing') { setMoodMessage("Đang nghĩ... 🤔");

    } else if (status === 'connecting') { setMoodMessage("Kết nối... 📡"); }

    return () => clearInterval(moodInterval);

  }, [liveState, status, idleThoughts]);



  const playAudioChunk = useCallback((base64Audio) => {

    if (!audioContextRef.current) return;

    try {

        const float32Data = base64ToFloat32(base64Audio);

        const buffer = audioContextRef.current.createBuffer(1, float32Data.length, 24000);

        buffer.getChannelData(0).set(float32Data);

        const source = audioContextRef.current.createBufferSource();

        source.buffer = buffer;

        source.connect(audioContextRef.current.destination);

        const currentTime = audioContextRef.current.currentTime;

        const startTime = Math.max(currentTime, nextStartTimeRef.current);

        source.start(startTime);

        nextStartTimeRef.current = startTime + buffer.duration;

        setLiveState('speaking');

        setAudioLevel(Math.random());

        source.onended = () => { 

          if (audioContextRef.current.currentTime >= nextStartTimeRef.current - 0.1) {

            setLiveState('idle'); 

            setAudioLevel(0); 

          }

        };

    } catch (e) { console.error("Error playing audio chunk:", e); }

  }, []);



  const stopRecording = useCallback(() => {

    if (workletNodeRef.current) { workletNodeRef.current.disconnect(); workletNodeRef.current = null; }

    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }

    setLiveState('processing'); setAudioLevel(0); setMoodMessage("Đang suy nghĩ... 🤔");

    if (wsRef.current?.readyState === WebSocket.OPEN) { wsRef.current.send(JSON.stringify({ client_content: { turn_complete: true } })); }

  }, []);



  const disconnect = useCallback(() => {

    stopRecording();

    if (wsRef.current) wsRef.current.close();

    if (audioContextRef.current) audioContextRef.current.close();

    setStatus('disconnected'); setLiveState('idle'); setDuration(0);

  }, [stopRecording]);



  const connect = useCallback(async () => {

    // Cleanup trước khi kết nối mới
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {

      setStatus('connecting');

      setMoodMessage("Đang kết nối... 📡");

      // Khởi tạo AudioContext trước
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      }

      // Kết nối đến backend proxy
      wsRef.current = new WebSocket(WS_URL);

      // Timeout để phát hiện kết nối thất bại
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          console.error('WebSocket connection timeout');
          setStatus('disconnected');
          setMoodMessage("Không thể kết nối đến server. Vui lòng kiểm tra backend đã chạy chưa.");
          if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
          }
        }
      }, 10000); // 10 giây timeout

      

      wsRef.current.onopen = () => {

        clearTimeout(connectionTimeout);

        console.log('✅ Đã kết nối đến backend WebSocket');

        setStatus('connected');

        setLiveState('idle');

        setMoodMessage("Sẵn sàng! 👋");

        setDuration(0);

        // Gửi config model đúng: gemini-2.5-flash-live

        try {

          wsRef.current.send(JSON.stringify({

              setup: { 

                model: "models/gemini-2.5-flash-live", 

                generation_config: { 

                  response_modalities: ["AUDIO"] 

                } 

              }

          }));

          console.log('✅ Đã gửi setup config đến Gemini');

        } catch (sendError) {

          console.error('Lỗi khi gửi setup config:', sendError);

        }

      };

      

      wsRef.current.onmessage = async (event) => {

        try {

          const message = JSON.parse(event.data);

          

          // Xử lý lỗi từ server
          if (message.error) {

            console.error('Lỗi từ server:', message.error);

            setMoodMessage("Lỗi: " + message.error);

            return;

          }

          

          // Xử lý audio response từ Gemini
          if (message.serverContent?.modelTurn?.parts) {

            const parts = message.serverContent.modelTurn.parts;

            for (const part of parts) {

              if (part.inlineData?.mimeType?.startsWith('audio/')) {

                playAudioChunk(part.inlineData.data);

                setMoodMessage("Minh đang trả lời... 🗣️");

              }

              if (part.text) {

                setMoodMessage(part.text.slice(0, 20) + "...");

              }

            }

          }

          

          // Xử lý khi turn hoàn thành
          if (message.serverContent?.turnComplete) { 

            setLiveState('idle'); 

            setMoodMessage("Bạn nói tiếp đi! 👂"); 

          }

        } catch (parseError) {

          console.error('Lỗi parse message từ server:', parseError);

        }

      };

      

      wsRef.current.onclose = (event) => { 

        clearTimeout(connectionTimeout);

        console.log('WebSocket đã đóng. Code:', event.code, 'Reason:', event.reason);

        

        setStatus('disconnected'); 

        // Cleanup recording if active
        if (workletNodeRef.current) {
          workletNodeRef.current.disconnect();
          workletNodeRef.current = null;
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        if (audioContextRef.current) {
          audioContextRef.current.close().catch(console.error);
          audioContextRef.current = null;
        }
        setLiveState('idle');
        setDuration(0);
        
        // Thông báo lý do đóng nếu có
        if (event.code !== 1000) { // 1000 = normal closure
          setMoodMessage("Kết nối bị ngắt. Vui lòng thử lại.");
        }
      };

      

      wsRef.current.onerror = (error) => { 

        clearTimeout(connectionTimeout);

        console.error("❌ WebSocket Error:", error);

        setStatus('disconnected'); 

        setMoodMessage("Lỗi kết nối. Kiểm tra backend tại ws://localhost:8000/v1/live");

        // Đóng kết nối nếu có lỗi
        if (wsRef.current) {
          wsRef.current.close();
          wsRef.current = null;
        }
      };

    } catch (error) { 

      console.error("❌ Connection failed:", error); 

      setStatus('disconnected'); 

      setMoodMessage("Không thể khởi tạo kết nối. " + error.message);

    }

  }, [playAudioChunk]);



  const startRecording = useCallback(async () => {

    if (!audioContextRef.current || !wsRef.current) return;

    try {

        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 }});

        streamRef.current = stream;

        const source = audioContextRef.current.createMediaStreamSource(stream);

        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        processor.onaudioprocess = (e) => {

            if (wsRef.current?.readyState === WebSocket.OPEN) {

                const inputData = e.inputBuffer.getChannelData(0);

                const pcmData = floatTo16BitPCM(inputData);

                const blob = new Blob([pcmData]);

                const reader = new FileReader();

                reader.onload = () => {

                     const base64data = reader.result.split(',')[1];

                     wsRef.current.send(JSON.stringify({ realtime_input: { media_chunks: [{ mime_type: "audio/pcm", data: base64data }] } }));

                };

                reader.readAsDataURL(blob);

                setAudioLevel(Math.random());

            }

        };

        source.connect(processor);

        processor.connect(audioContextRef.current.destination);

        workletNodeRef.current = processor;

        setLiveState('listening');

        setMoodMessage("Đang nghe... 👂");

        if (currentContext.hasImage || currentContext.latestUserMessage) {

             setMoodMessage("Đã nhận ngữ cảnh! 👁️");

        }

    } catch (e) { console.error("Mic error:", e); }

  }, [currentContext]);



  const toggleMic = useCallback(() => {

    if (liveState === 'listening') stopRecording(); else startRecording();

  }, [liveState, startRecording, stopRecording]);



  useEffect(() => {

    let timer;

    if (status === 'connected') timer = setInterval(() => setDuration(prev => prev + 1), 1000);

    return () => clearInterval(timer);

  }, [status]);



  const formatTime = (secs) => {

    const m = Math.floor(secs / 60);

    const s = secs % 60;

    return `${m}:${s < 10 ? '0' : ''}${s}`;

  };



  return { status, liveState, audioLevel, moodMessage, connect, disconnect, toggleMic, formattedTime: formatTime(duration) };

};



// =================================================================

// 5. MAIN COMPONENT: CHAT PAGE

// =================================================================

const chatHistoryCollection = collection(db, 'chatHistory');



export function ChatPage() {

  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);

  const [messages, setMessages] = useState([]);

  const [currentSessionId, setCurrentSessionId] = useState(null);

  const [isSessionLoaded, setIsSessionLoaded] = useState(false);

  const [input, setInput] = useState('');

  const [selectedImage, setSelectedImage] = useState(null);

  const fileInputRef = useRef(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [isTyping, setIsTyping] = useState(false);

  const scrollRef = useRef(null);

  const [isMobile, setIsMobile] = useState(false);

  const [isLiveMode, setIsLiveMode] = useState(false);



  // --- FIX QUAN TRỌNG: KHÓA CUỘN BODY ĐỂ TRÁNH 2 THANH TRƯỢT ---

  useEffect(() => {

    document.body.style.overflow = 'hidden';

    document.documentElement.style.overflow = 'hidden';

    return () => {

      document.body.style.overflow = 'unset';

      document.documentElement.style.overflow = 'unset';

    };

  }, []);



  // --- DETECT SCREEN ---

  useEffect(() => {

    const checkScreenSize = () => {

      const mobile = window.innerWidth < 1024;

      setIsMobile(mobile);

      if (!mobile) setIsSidebarOpen(true);

      else setIsSidebarOpen(false);

    };

    checkScreenSize();

    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);

  }, []);



  // --- FIRESTORE SYNC ---

  useEffect(() => {

    if (!user?.uid) return;

    const sessionsQuery = query(chatHistoryCollection, where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));

    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {

      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      loaded.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      setSessions(loaded);

    }, (error) => {

      const errorMessage = error?.message || '';

      const errorCode = error?.code || '';

      if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 

          errorMessage.includes('blocked') ||

          errorMessage.includes('network') ||

          errorCode === 'unavailable') {

        console.warn('Chat sessions fetch skipped (blocked by ad blocker or network issue)');

        setSessions([]);

      } else {

        console.error('Error loading chat sessions:', error);

      }

    });

    return () => unsubSessions();

  }, [user?.uid]);



  useEffect(() => {

    if (sessions.length > 0 && !currentSessionId && !isSessionLoaded) {

      setCurrentSessionId(sessions[0].id);

      setIsSessionLoaded(true);

    }

  }, [sessions, currentSessionId, isSessionLoaded]);



  useEffect(() => {

    if (!currentSessionId || !user?.uid) { setMessages([]); return; }

    const sessionRef = doc(chatHistoryCollection, currentSessionId);

    const unsub = onSnapshot(sessionRef, (snapshot) => {

      if (snapshot.exists()) {

        const sessionData = snapshot.data();

        if (sessionData.userId === user.uid) setMessages(sessionData.messages || []);

      }

    }, (error) => {

      const errorMessage = error?.message || '';

      const errorCode = error?.code || '';

      if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT') || 

          errorMessage.includes('blocked') ||

          errorMessage.includes('network') ||

          errorCode === 'unavailable') {

        console.warn('Chat messages fetch skipped (blocked by ad blocker or network issue)');

        setMessages([]);

      } else {

        console.error('Error loading chat messages:', error);

      }

    });

    return () => unsub();

  }, [currentSessionId, user?.uid]);



  const currentMessages = useMemo(() => {

    if (!currentSessionId) return [];

    return messages.sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));

  }, [messages, currentSessionId]);



  const liveContext = useMemo(() => {

      const lastMsg = currentMessages.length > 0 ? currentMessages[currentMessages.length - 1] : null;

      return {

          hasImage: !!selectedImage,

          latestUserMessage: input || (lastMsg?.role === 'user' ? lastMsg.content : null)

      };

  }, [selectedImage, input, currentMessages]);

  

  const { status: connStatus, liveState, audioLevel, moodMessage, connect, disconnect, toggleMic, formattedTime } = useGeminiLive(liveContext);



  useEffect(() => {

    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });

  }, [currentMessages, isTyping]);



  // --- HANDLERS ---

  const createNewSession = async () => {

    if (!user?.uid) return;

    const ref = await addDoc(chatHistoryCollection, {

      userId: user.uid, title: 'Cuộc trò chuyện mới', messages: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),

    });

    setCurrentSessionId(ref.id); setInput(''); setSelectedImage(null);

    if (isMobile) setIsSidebarOpen(false);

  };



  const deleteSession = async (e, id) => {

    e.stopPropagation();

    if (confirm("Xóa cuộc trò chuyện này?")) {

        await deleteDoc(doc(chatHistoryCollection, id));

        if (currentSessionId === id) { setCurrentSessionId(null); setMessages([]); }

    }

  };



  const handleImageSelect = (e) => {

    const file = e.target.files?.[0];

    if (file) {

      const reader = new FileReader();

      reader.onloadend = () => setSelectedImage(reader.result);

      reader.readAsDataURL(file);

    }

  };



  const sendMessage = async (text, isVoice = false) => {

    if ((!text.trim() && !selectedImage) || !user?.uid) return;

    const textToSend = text.trim();

    const imageToSend = selectedImage;

    setInput(''); setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = '';



    let activeSessionId = currentSessionId;

    if (!activeSessionId) {

      const ref = await addDoc(chatHistoryCollection, {

        userId: user.uid, title: textToSend.slice(0, 30) || 'Hình ảnh mới...', messages: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),

      });

      activeSessionId = ref.id; setCurrentSessionId(activeSessionId);

    }



    setIsTyping(true); if (isVoice) setLiveState('processing');



    try {

      const sessionRef = doc(chatHistoryCollection, activeSessionId);

      const sessionSnap = await getDoc(sessionRef);

      if (!sessionSnap.exists()) throw new Error('Session not found');

      

      const currentMessages = sessionSnap.data().messages || [];

      const userMessage = { role: 'user', content: textToSend + (imageToSend ? ' [Đã gửi ảnh]' : ''), timestamp: new Date() };

      const updatedMessages = [...currentMessages, userMessage];

      await updateDoc(sessionRef, { messages: updatedMessages, updatedAt: serverTimestamp() });



      const history = currentMessages.slice(-5).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', content: msg.content }));

      const responseText = await callGeminiMultimodal(textToSend, imageToSend, history);

      const aiMessage = { role: 'ai', content: responseText, timestamp: new Date() };

      

      await updateDoc(sessionRef, { messages: [...updatedMessages, aiMessage], updatedAt: serverTimestamp() });

      if (isVoice && isLiveMode) { setLiveState('processing_audio'); setLiveState('idle'); } else { if (isLiveMode) setLiveState('idle'); }

    } catch (e) { console.error(e); setLiveState('idle'); } finally { setIsTyping(false); }

  };



  const toggleLiveMode = () => {

    if (isLiveMode) { setIsLiveMode(false); disconnect(); } else { setIsLiveMode(true); connect(); }

  };



  if (!user) {

    return (

      <div className="flex items-center justify-center h-full">

        <div className="text-center">

          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>

          <p className="text-slate-600">Đang tải...</p>

        </div>

      </div>

    );

  }



  // --- LAYOUT RENDER ---

  return (

    <ThreeColumnLayout>

      {/* Styles được inject trực tiếp để đảm bảo không bị thiếu */}

      <style>{cssStyles}</style>

      

      {/* CONTAINER CHÍNH: Fixed để chống trôi layout */}

      <div 

        className="fixed inset-x-0 bottom-0 flex bg-gray-50 font-sans text-gray-800 overflow-hidden" 

        style={{ top: '64px' }} // Chừa chỗ cho Navbar chung

      >

        

        {isMobile && isSidebarOpen && (

          <div className="absolute inset-0 bg-black/50 z-30 transition-opacity" onClick={() => setIsSidebarOpen(false)} />

        )}



        {/* SIDEBAR */}

        <aside className={`

            ${isMobile ? 'absolute h-full z-40' : 'relative h-full'} 

            bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out

            ${

              isSidebarOpen 

                ? 'w-64 translate-x-0' // Trạng thái MỞ: Rộng 64, không dịch chuyển

                : (isMobile ? '-translate-x-full w-64' : 'w-0 overflow-hidden border-none') // Trạng thái ĐÓNG: Mobile thì trượt ra ngoài, Desktop thì co về 0

            }

        `}>

          <div className="p-4 border-b border-gray-100 flex items-center justify-between">

              <h1 className="font-bold text-base text-blue-600 flex items-center gap-2 truncate"><Sparkles size={18} /> Lịch sử trò chuyện</h1>

              {isMobile && <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>}

          </div>

          <div className="p-3">

            <button onClick={createNewSession} className="w-full flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium text-sm"><Plus size={18} /> <span>Cuộc trò chuyện mới</span></button>

          </div>

          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1">

            {sessions.length === 0 ? (

              <div className="text-center py-8 px-4 text-slate-500 text-sm"><p>Chưa có cuộc trò chuyện nào</p></div>

            ) : (

              sessions.map((session) => (

                <div key={session.id} className="relative group">

                  <button onClick={() => { setCurrentSessionId(session.id); if (isMobile) setIsSidebarOpen(false); }} className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all ${currentSessionId === session.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>

                    <MessageSquare size={16} className={currentSessionId === session.id ? 'text-blue-500' : 'text-gray-400'} />

                    <span className="truncate flex-1">{session.title || 'Cuộc trò chuyện'}</span>

                  </button>

                  <button onClick={(e) => deleteSession(e, session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white text-gray-400 hover:text-red-500 transition-all shadow-sm"><Trash2 size={14} /></button>

                </div>

              ))

            )}

          </div>

        </aside>



        {/* MAIN CONTENT */}

        <div className="flex-1 flex flex-col h-full relative w-full bg-white min-h-0 min-w-0">

          

          {/* HEADER (Fixed Height) */}

          <header className="h-16 flex-none flex items-center justify-between px-2 md:px-4 border-b border-gray-100 bg-white/95 backdrop-blur-sm z-20 transition-all duration-300">

              <div className="flex items-center gap-2 flex-1 min-w-0 mr-1 md:mr-2 h-full">

                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 shrink-0">{isSidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>

                  

                  {/* DYNAMIC HEADER CONTENT */}

                  {isLiveMode ? (

                      <div className="flex-1 flex items-center justify-between bg-blue-50/80 border border-blue-200 rounded-2xl px-2 py-1 md:px-4 animate-in fade-in slide-in-from-top-2 duration-300 origin-top shadow-sm h-11 md:h-12">

                          <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">

                              <MascotFace status={liveState} volumeLevel={audioLevel} />

                              <div className="flex flex-col justify-center min-w-0 flex-1">

                                  <div className="flex items-center gap-2"><span className="font-bold text-xs md:text-sm text-gray-800 truncate transition-all duration-500">{moodMessage}</span></div>

                                  <div className="flex items-center gap-2 md:gap-3 h-3 md:h-3.5 mt-0.5">

                                      <div className="flex items-center gap-1 text-[9px] md:text-[10px] text-gray-500 font-mono bg-white/60 px-1 md:px-1.5 rounded-sm shrink-0"><Clock size={8} /> {formattedTime}</div>

                                      {liveState === 'listening' || liveState === 'speaking' ? (<AudioVisualizer isActive={true} role={liveState === 'speaking' ? 'ai' : 'user'} />) : (<div className="flex items-center gap-1 shrink-0"><div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div><span className="text-[9px] md:text-[10px] text-green-600 font-medium hidden sm:inline">Trực tuyến</span></div>)}

                                  </div>

                              </div>

                          </div>

                          <div className="flex items-center gap-1.5 md:gap-2 ml-1 md:ml-2 pl-1.5 md:pl-2 border-l border-blue-200/50">

                               <button onClick={toggleMic} disabled={connStatus !== 'connected'} className={`w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center transition-all shadow-sm active:scale-95 shrink-0 ${connStatus !== 'connected' ? 'bg-gray-200 text-gray-400' : liveState === 'listening' ? 'bg-red-500 text-white animate-pulse shadow-red-200 ring-2 ring-red-100' : 'bg-white text-blue-600 border border-blue-100 hover:bg-blue-50'}`}>{liveState === 'listening' ? <MicOff size={14} className="md:w-4 md:h-4" /> : <Mic size={14} className="md:w-4 md:h-4" />}</button>

                              <button onClick={toggleLiveMode} className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-red-500 transition-colors active:scale-95 shrink-0"><X size={16} className="md:w-[18px] md:h-[18px]" /></button>

                          </div>

                      </div>

                  ) : (

                      <span className="font-semibold text-gray-700 truncate animate-in fade-in duration-300 text-base md:text-lg">{sessions.find(s => s.id === currentSessionId)?.title || "Chào bạn!"}</span>

                  )}

              </div>

              {!isLiveMode && (<button onClick={toggleLiveMode} className="shrink-0 flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-md transition-all shadow-sm active:scale-95 group"><Headphones size={16} className="group-hover:animate-bounce" /> <span className="text-xs md:text-sm font-bold hidden md:inline">Tìm Anh Thơ</span><span className="text-xs md:text-sm font-bold md:hidden">Trò Chuyện</span></button>)}

          </header>



          {/* CHAT AREA (Tự co giãn, có thanh cuộn) */}

          <div className="flex-1 overflow-y-auto bg-gray-50 scroll-smooth min-h-0">

              <div className="max-w-3xl mx-auto px-4 py-6">

                  {!currentSessionId || currentMessages.length === 0 ? (

                      <div className="mt-12 text-center text-gray-400 animate-in fade-in slide-in-from-bottom-4 duration-500">

                          <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><Sparkles size={32} /></div>

                          <h2 className="text-2xl font-semibold text-gray-700">Sẵn sàng học cùng nhau chưa?</h2>

                          <p className="mb-8 mt-2 text-gray-500">Mình là trợ lý cùng bàn học với bạn.</p>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto text-left">

                              {[{ icon: Calculator, color: 'text-blue-500', bg: 'bg-blue-100', title: 'Giải toán', prompt: 'Giúp tớ giải bài toán với !! ' }, { icon: BookOpen, color: 'text-orange-500', bg: 'bg-orange-100', title: 'Soạn văn', prompt: 'Lập dàn ý cho bài văn được không ' }].map((item, idx) => (

                                  <button key={idx} onClick={() => setInput(item.prompt)} className="p-4 rounded-xl bg-white hover:bg-gray-50 border border-gray-200 shadow-sm hover:shadow-md transition-all flex items-center gap-3"><div className={`p-2 rounded-lg ${item.bg} ${item.color}`}><item.icon size={18} /></div><span className="font-medium text-gray-700">{item.title}</span></button>

                              ))}

                          </div>

                      </div>

                  ) : (

                      <div className="space-y-6">

                          {currentMessages.map((msg, idx) => (

                              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                                  {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-orange-400 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm"><Smile size={16} /></div>}

                                  <div className={`max-w-[95%] rounded-2xl p-3 md:p-4 leading-relaxed text-sm md:text-base shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'}`}>

                                      {msg.hasImage && <div className="mb-2 p-1 bg-white/20 rounded-lg inline-block"><ImageIcon size={20} className="text-white/80" /></div>}

                                      <div className="whitespace-pre-wrap">{renderTextWithLatex(msg.content)}</div>

                                  </div>

                              </div>

                          ))}

                          {isTyping && !isLiveMode && <div className="flex items-center gap-2 text-gray-400 text-sm italic ml-12 animate-pulse">...Đang suy nghĩ</div>}

                          <div ref={scrollRef}></div>

                      </div>

                  )}

              </div>

          </div>



          {/* INPUT AREA (Cố định ở đáy) */}

          <div className="flex-none bg-white border-t border-gray-100 p-3 md:p-4 z-50 relative shadow-lg">

              <div className="max-w-3xl mx-auto relative">

                  {selectedImage && (

                      <div className="absolute bottom-full left-0 mb-2 p-2 bg-white rounded-xl shadow-lg border border-gray-100 animate-in zoom-in duration-200"><div className="relative"><img src={selectedImage} alt="Selected" className="h-20 rounded-lg object-cover" /><button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 hover:bg-red-500"><X size={12} /></button></div></div>

                  )}

                  <div className="flex items-center gap-2 bg-gray-100 rounded-full p-1.5 border border-transparent focus-within:border-blue-300 focus-within:bg-white focus-within:shadow-md transition-all">

                      <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><ImageIcon size={20} /></button>

                      <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />

                      <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)} placeholder="Nhập tin nhắn..." className="flex-1 bg-transparent border-none outline-none text-gray-800 px-2 py-2 placeholder-gray-500" />

                      {input.trim() || selectedImage ? <button onClick={() => sendMessage(input)} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-sm"><Send size={18} /></button> : <button onClick={toggleLiveMode} className="p-2 text-gray-500 hover:text-pink-500 hover:bg-pink-50 rounded-full transition-colors"><Mic size={20} /></button>}

                  </div>

              </div>

          </div>

        </div>

      </div>

    </ThreeColumnLayout>

  );

}



export default ChatPage;

