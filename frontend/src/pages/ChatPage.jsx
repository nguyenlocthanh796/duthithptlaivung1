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
import './ChatPage.css';

// --- UTILS: AUDIO PROCESSING ---
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

// --- COMPONENTS ---
const AudioVisualizer = ({ isActive, role = 'user' }) => (
  <div className="flex items-center gap-0.5 h-3 md:h-4">
    {[...Array(5)].map((_, i) => (
      <div
        key={i}
        className={`w-0.5 md:w-1 rounded-full transition-all duration-100 ${
          role === 'user' ? 'bg-blue-500' : 'bg-pink-500'
        }`}
        style={{
          height: isActive ? `${Math.random() * 10 + 4}px` : '3px',
          animation: isActive ? `bounce-wave 0.5s infinite ${i * 0.1}s` : 'none'
        }}
      ></div>
    ))}
  </div>
);

const MascotFace = ({ status, volumeLevel = 0 }) => {
  const mouthHeight = status === 'speaking' ? Math.max(2, Math.min(8, volumeLevel * 6)) : 2;
  return (
    <div className="w-9 h-9 md:w-11 md:h-11 shrink-0 rounded-full bg-blue-100 flex items-center justify-center transition-all duration-300 shadow-sm ring-1 md:ring-2 ring-white relative z-10">
      <div className="relative w-5 h-5 md:w-6 md:h-6 bg-white rounded-full flex items-center justify-center overflow-hidden">
        <div className={`absolute left-1.5 top-2 w-0.5 h-1.5 bg-gray-900 rounded-full transition-all ${status === 'listening' ? 'h-2' : ''}`}></div>
        <div className={`absolute right-1.5 top-2 w-0.5 h-1.5 bg-gray-900 rounded-full transition-all ${status === 'listening' ? 'h-2' : ''}`}></div>
        <div className="absolute bottom-1.5 w-2.5 md:w-3 bg-gray-900 rounded-full transition-all duration-75" style={{ height: `${mouthHeight}px`, borderRadius: status === 'speaking' ? '50%' : '4px' }}></div>
      </div>
      {status === 'listening' && <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 border-2 border-white rounded-full animate-pulse"></div>}
    </div>
  );
};

// --- HOOK: LOGIC LIVE ---
const useGeminiLive = (currentContext) => {
  // Thay URL này bằng URL Backend của bạn (ví dụ: 'ws://localhost:8080' hoặc URL Cloud Run)
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';
  
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
  const idleThoughts = useMemo(() => ["Học gì nhỉ? 🤔", "Đang nghe... 👂", "Cố lên! 💪", "Khó không? 📚"], []);

  useEffect(() => {
    let moodInterval;
    if (liveState === 'idle' && status === 'connected') {
        moodInterval = setInterval(() => {
            setMoodMessage(idleThoughts[Math.floor(Math.random() * idleThoughts.length)]);
        }, 5000);
    } else if (liveState === 'listening') setMoodMessage("Đang nghe... 👂");
    else if (liveState === 'processing') setMoodMessage("Đang nghĩ... 🤔");
    else if (status === 'connecting') setMoodMessage("Kết nối... 📡");
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
                 setLiveState('idle'); setAudioLevel(0);
             }
        };
    } catch (e) { console.error("Audio Error:", e); }
  }, []);

  const connect = useCallback(async () => {
    try {
      setStatus('connecting');
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      wsRef.current = new WebSocket(WS_URL);
      
      wsRef.current.onopen = () => {
        setStatus('connected'); setLiveState('idle'); setMoodMessage("Sẵn sàng! 👋"); setDuration(0);
      };
      
      wsRef.current.onmessage = async (event) => {
        const message = JSON.parse(event.data);
        if (message.serverContent?.modelTurn?.parts) {
            message.serverContent.modelTurn.parts.forEach(part => {
                if (part.inlineData?.mimeType.startsWith('audio/')) playAudioChunk(part.inlineData.data);
                if (part.text) setMoodMessage(part.text.slice(0, 25) + "...");
            });
        }
        if (message.serverContent?.turnComplete) { setLiveState('idle'); setMoodMessage("Bạn nói tiếp đi! 👂"); }
      };
      
      wsRef.current.onclose = () => { setStatus('disconnected'); disconnect(); };
      wsRef.current.onerror = (e) => { console.error("WS Error:", e); setStatus('disconnected'); };
    } catch (error) { console.error("Connection failed:", error); setStatus('disconnected'); }
  }, [WS_URL, playAudioChunk]);

  const startRecording = useCallback(async () => {
    if (!audioContextRef.current || !wsRef.current) return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, sampleRate: 16000 }});
        streamRef.current = stream;
        const source = audioContextRef.current.createMediaStreamSource(stream);
        const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e) => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                const pcmData = floatTo16BitPCM(e.inputBuffer.getChannelData(0));
                const reader = new FileReader();
                reader.onload = () => {
                     wsRef.current.send(JSON.stringify({ realtime_input: { media_chunks: [{ mime_type: "audio/pcm", data: reader.result.split(',')[1] }] } }));
                };
                reader.readAsDataURL(new Blob([pcmData]));
                setAudioLevel(Math.random());
            }
        };
        source.connect(processor); processor.connect(audioContextRef.current.destination);
        workletNodeRef.current = processor;
        setLiveState('listening'); setMoodMessage("Đang nghe... 👂");
    } catch (e) { console.error("Mic error:", e); }
  }, []);

  const stopRecording = useCallback(() => {
    if (workletNodeRef.current) { workletNodeRef.current.disconnect(); workletNodeRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(track => track.stop()); streamRef.current = null; }
    setLiveState('processing'); setAudioLevel(0); setMoodMessage("Đang suy nghĩ... 🤔");
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify({ client_content: { turn_complete: true } }));
  }, []);

  const disconnect = useCallback(() => {
    stopRecording();
    if (wsRef.current) wsRef.current.close();
    if (audioContextRef.current) audioContextRef.current.close();
    setStatus('disconnected'); setLiveState('idle'); setDuration(0);
  }, [stopRecording]);

  const toggleMic = useCallback(() => {
    if (liveState === 'listening') stopRecording(); else startRecording();
  }, [liveState, startRecording, stopRecording]);

  useEffect(() => {
    let timer;
    if (status === 'connected') timer = setInterval(() => setDuration(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, [status]);

  const formatTime = (secs) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  return { status, liveState, audioLevel, moodMessage, connect, disconnect, toggleMic, formattedTime: formatTime(duration) };
};

// --- MAIN PAGE ---
const chatHistoryCollection = collection(db, 'chatHistory');

export default function ChatPage() {
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

  // 1. Khóa cuộn Body (Fix lỗi 2 thanh cuộn)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  // 2. Detect Mobile
  useEffect(() => {
    const checkScreenSize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) setIsSidebarOpen(true); else setIsSidebarOpen(false);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 3. Load Sessions
  useEffect(() => {
    if (!user?.uid) return;
    const sessionsQuery = query(chatHistoryCollection, where('userId', '==', user.uid), orderBy('updatedAt', 'desc'));
    const unsub = onSnapshot(sessionsQuery, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSessions(loaded);
    });
    return () => unsub();
  }, [user?.uid]);

  // 4. Auto Select Session
  useEffect(() => {
    if (sessions.length > 0 && !currentSessionId && !isSessionLoaded) {
      setCurrentSessionId(sessions[0].id); setIsSessionLoaded(true);
    }
  }, [sessions, currentSessionId, isSessionLoaded]);

  // 5. Load Messages
  useEffect(() => {
    if (!currentSessionId || !user?.uid) { setMessages([]); return; }
    const unsub = onSnapshot(doc(chatHistoryCollection, currentSessionId), (doc) => {
      if (doc.exists()) setMessages(doc.data().messages || []);
    });
    return () => unsub();
  }, [currentSessionId, user?.uid]);

  // 6. Context Live
  const { status: connStatus, liveState, audioLevel, moodMessage, connect, disconnect, toggleMic, formattedTime } = useGeminiLive({});

  // Auto Scroll
  useEffect(() => { if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  // Actions
  const createNewSession = async () => {
    if (!user?.uid) return;
    const ref = await addDoc(chatHistoryCollection, { userId: user.uid, title: 'Cuộc trò chuyện mới', messages: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
    setCurrentSessionId(ref.id); setInput(''); setSelectedImage(null); if (isMobile) setIsSidebarOpen(false);
  };

  const deleteSession = async (e, id) => {
    e.stopPropagation();
    if (confirm("Xóa cuộc trò chuyện này?")) { await deleteDoc(doc(chatHistoryCollection, id)); if (currentSessionId === id) { setCurrentSessionId(null); setMessages([]); } }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { const reader = new FileReader(); reader.onloadend = () => setSelectedImage(reader.result); reader.readAsDataURL(file); }
  };

  const sendMessage = async (text) => {
    if ((!text.trim() && !selectedImage) || !user?.uid) return;
    const textToSend = text.trim();
    const imageToSend = selectedImage;
    setInput(''); setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = '';
    let activeSessionId = currentSessionId;
    if (!activeSessionId) {
      const ref = await addDoc(chatHistoryCollection, { userId: user.uid, title: textToSend.slice(0, 30) || 'Hình ảnh mới...', messages: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      activeSessionId = ref.id; setCurrentSessionId(activeSessionId);
    }
    setIsTyping(true);
    try {
      const sessionRef = doc(chatHistoryCollection, activeSessionId);
      const sessionSnap = await getDoc(sessionRef);
      const currentMsgs = sessionSnap.data()?.messages || [];
      const userMsg = { role: 'user', content: textToSend + (imageToSend ? ' [Đã gửi ảnh]' : ''), timestamp: new Date() };
      await updateDoc(sessionRef, { messages: [...currentMsgs, userMsg], updatedAt: serverTimestamp() });
      const responseText = await callGeminiMultimodal(textToSend, imageToSend, currentMsgs);
      const aiMsg = { role: 'ai', content: responseText, timestamp: new Date() };
      await updateDoc(sessionRef, { messages: [...currentMsgs, userMsg, aiMsg], updatedAt: serverTimestamp() });
    } catch (e) { console.error(e); } finally { setIsTyping(false); }
  };

  const toggleLiveMode = () => { if (isLiveMode) { setIsLiveMode(false); disconnect(); } else { setIsLiveMode(true); connect(); } };

  if (!user) return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

  return (
    <ThreeColumnLayout>
      {/* Layout Fix: fixed inset-0 */}
      <div className="fixed inset-0 flex bg-gray-50 font-sans text-gray-800 overflow-hidden" style={{ top: '0px' }}>
        {isMobile && isSidebarOpen && <div className="absolute inset-0 bg-black/50 z-30 transition-opacity" onClick={() => setIsSidebarOpen(false)} />}
        <aside className={`${isMobile ? 'absolute' : 'relative'} z-40 h-full bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64 translate-x-0 shadow-xl lg:shadow-none' : (isMobile ? 'w-64 -translate-x-full' : 'w-0 overflow-hidden border-none')}`}>
          <div className="p-4 border-b border-gray-100 flex items-center justify-between"><h1 className="font-bold text-base text-blue-600 flex items-center gap-2 truncate"><Sparkles size={18} /> Lịch sử trò chuyện</h1>{isMobile && <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-gray-100 rounded"><X size={20} /></button>}</div>
          <div className="p-3"><button onClick={createNewSession} className="w-full flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors font-medium text-sm"><Plus size={18} /> <span>Cuộc trò chuyện mới</span></button></div>
          <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-hide">
            {sessions.map((session) => (
              <div key={session.id} className="relative group">
                <button onClick={() => { setCurrentSessionId(session.id); if (isMobile) setIsSidebarOpen(false); }} className={`w-full text-left flex items-center gap-3 px-3 py-3 rounded-lg text-sm transition-all ${currentSessionId === session.id ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}><MessageSquare size={16} /><span className="truncate flex-1">{session.title}</span></button>
                <button onClick={(e) => deleteSession(e, session.id)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-white text-gray-400 hover:text-red-500 transition-all shadow-sm"><Trash2 size={14} /></button>
              </div>
            ))}
          </div>
        </aside>
        <div className="flex-1 flex flex-col h-full relative w-full bg-white min-h-0 min-w-0">
          <header className="h-16 flex-none flex items-center justify-between px-2 md:px-4 border-b border-gray-100 bg-white/95 backdrop-blur-sm z-20 transition-all duration-300">
              <div className="flex items-center gap-2 flex-1 min-w-0 mr-1 md:mr-2 h-full">
                  <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 rounded-full text-gray-600 shrink-0">{isSidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
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
                  ) : (<span className="font-semibold text-gray-700 truncate animate-in fade-in duration-300 text-base md:text-lg">{sessions.find(s => s.id === currentSessionId)?.title || "Chào bạn!"}</span>)}
              </div>
              {!isLiveMode && (<button onClick={toggleLiveMode} className="shrink-0 flex items-center gap-2 px-3 py-1.5 md:px-5 md:py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-full hover:shadow-md transition-all shadow-sm active:scale-95 group"><Headphones size={16} className="group-hover:animate-bounce" /> <span className="text-xs md:text-sm font-bold hidden md:inline">Tìm Anh Thơ  </span><span className="text-xs md:text-sm font-bold md:hidden">Tìm Anh Thơ </span></button>)}
          </header>
          {/* CHAT AREA (Scrollable + min-h-0) */}
          <div className="flex-1 overflow-y-auto bg-gray-50 scroll-smooth min-h-0 scrollbar-hide">
              <div className="max-w-3xl mx-auto px-4 py-6">
                  {!currentSessionId || messages.length === 0 ? (
                    <div className="h-full flex flex-col justify-center items-center px-4 animate-in fade-in duration-500">
                      {/* Logo / Icon Gemini */}
                      <div className="mb-6">
                         <Sparkles className="w-12 h-12 text-blue-500 animate-pulse" />
                      </div>
                      
                      {/* Gradient Text: Xin chào */}
                      <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-red-500 mb-2 text-center">
                        Xin chào, Bạn Học
                      </h1>
                      <h2 className="text-2xl md:text-3xl font-medium text-gray-400 mb-10 text-center">
                        Hôm nay tôi có thể giúp gì cho bạn?
                      </h2>
                      {/* Suggestion Cards (Thẻ gợi ý) - Phù hợp học sinh THPT */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                        {[
                          { icon: Calculator, color: 'text-blue-500', bg: 'bg-blue-50', title: 'Giải bài toán THPT', desc: 'Giúp mình giải bài toán đại số lớp 12 về đạo hàm và nguyên hàm...' },
                          { icon: BookOpen, color: 'text-purple-500', bg: 'bg-purple-50', title: 'Phân tích tác phẩm văn học', desc: 'Phân tích bài thơ "Việt Bắc" của Tố Hữu và nghệ thuật...' },
                          { icon: ImageIcon, color: 'text-green-500', bg: 'bg-green-50', title: 'Giải bài tập bằng ảnh', desc: 'Chụp ảnh bài tập Toán/Lý/Hóa và gửi cho mình giải nhé!' },
                          { icon: Sparkles, color: 'text-orange-500', bg: 'bg-orange-50', title: 'Ôn thi THPT Quốc gia', desc: 'Hướng dẫn mình lập kế hoạch ôn tập và làm đề thi thử...' },
                        ].map((item, idx) => (
                          <button 
                            key={idx} 
                            onClick={() => sendMessage(item.desc)}
                            className="text-left p-4 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-all border border-transparent hover:border-gray-200 group"
                          >
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`p-2 rounded-full ${item.bg} ${item.color}`}>
                                <item.icon size={18} />
                              </div>
                              <span className="font-medium text-gray-700">{item.title}</span>
                            </div>
                            <p className="text-sm text-gray-500 line-clamp-1">{item.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                      <div className="space-y-6">
                          {messages.map((msg, idx) => (
                              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                  {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-orange-400 flex items-center justify-center text-white shrink-0 mt-1 shadow-sm"><Smile size={16} /></div>}
                                  <div className={`max-w-[85%] rounded-2xl p-3 md:p-4 leading-relaxed text-sm md:text-base shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'}`}>
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
          {/* INPUT AREA - Phong cách Gemini (Nổi, Bo tròn, Xám nhạt) */}
          <div className="flex-none px-4 pb-12 pt-2 z-50 bg-transparent">
            <div className="max-w-3xl mx-auto">
              {/* Hiển thị ảnh preview nếu có */}
              {selectedImage && (
                <div className="mb-3 relative inline-block">
                  <img src={selectedImage} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-200" />
                  <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-gray-800 text-white p-0.5 rounded-full hover:bg-red-500"><X size={12} /></button>
                </div>
              )}
              {/* Thanh nhập liệu chính */}
              <div className="flex items-center gap-3 bg-[#f0f4f9] hover:bg-[#e9eef6] transition-colors rounded-[28px] px-4 py-3">
                {/* Nút + (Thêm tệp) */}
                <button onClick={() => fileInputRef.current?.click()} className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors flex-shrink-0">
                  <Plus size={18} />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
                {/* Ô nhập liệu */}
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
                  placeholder="Hỏi Anh Thơ về bài học..."
                  className="flex-1 bg-transparent border-none outline-none text-gray-800 text-base placeholder-gray-500 ml-2"
                />
                {/* Các nút hành động bên phải */}
                <div className="flex items-center gap-2">
                  {input.trim() || selectedImage ? (
                    <button onClick={() => sendMessage(input)} className="p-2 text-white bg-blue-600 rounded-full hover:bg-blue-700 transition-all shadow-sm">
                      <Send size={18} />
                    </button>
                  ) : (
                    <>
                      {/* Nút Ảnh (Optional) */}
                      <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors">
                        <ImageIcon size={20} />
                      </button>
                      {/* Nút Mic / Live */}
                      <button onClick={toggleLiveMode} className={`p-2 rounded-full transition-colors ${isLiveMode ? 'bg-red-100 text-red-500' : 'text-gray-500 hover:bg-gray-200'}`}>
                         {isLiveMode ? <MicOff size={20} /> : <Mic size={20} />}
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <p className="text-center text-[10px] text-gray-400 mt-2">
                Anh Thơ có thể mắc lỗi. Hãy kiểm tra lại các thông tin quan trọng.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ThreeColumnLayout>
  );
}

