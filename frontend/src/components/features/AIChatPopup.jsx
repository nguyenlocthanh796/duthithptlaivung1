import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot, User, Loader2, Smile, Image as ImageIcon, Mic, MicOff, Radio, MessageCircle } from 'lucide-react';
import { callGeminiAI } from '../../services/geminiService';
import { SpeechRecognitionService, AudioVisualizer, voiceService } from '../../services/voiceService';
import { useVoiceChat } from '../../contexts/VoiceChatContext';

// Component render message với markdown và LaTeX
const MessageContent = ({ text }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;

    const renderText = typeof text === 'string' ? text : String(text || '');
    containerRef.current.innerHTML = '';

    const renderTextWithMarkdown = (textContent, parentElement) => {
      const latexPattern = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
      const parts = textContent.split(latexPattern);

      parts.forEach((part) => {
        if (!part) return;

        // LaTeX display mode ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const mathContent = part.slice(2, -2).trim();
          const wrapper = document.createElement('div');
          wrapper.className = 'katex-display-block my-2';
          if (window.katex) {
            try {
              window.katex.render(mathContent, wrapper, { displayMode: true, throwOnError: false });
            } catch (e) {
              wrapper.textContent = part;
            }
          } else {
            wrapper.textContent = part;
          }
          parentElement.appendChild(wrapper);
        }
        // LaTeX inline ($...$)
        else if (part.startsWith('$') && part.endsWith('$') && part.length > 2 && !part.startsWith('$$')) {
          const mathContent = part.slice(1, -1).trim();
          const span = document.createElement('span');
          span.className = 'katex-inline';
          if (window.katex) {
            try {
              window.katex.render(mathContent, span, { displayMode: false, throwOnError: false });
            } catch (e) {
              span.textContent = part;
            }
          } else {
            span.textContent = part;
          }
          parentElement.appendChild(span);
        }
        // Markdown bold (**text**)
        else {
          const boldPattern = /\*\*([^*]+)\*\*/g;
          let lastIndex = 0;
          let match;

          while ((match = boldPattern.exec(part)) !== null) {
            if (match.index > lastIndex) {
              const beforeText = part.substring(lastIndex, match.index);
              if (beforeText) {
                parentElement.appendChild(document.createTextNode(beforeText));
              }
            }

            const bold = document.createElement('strong');
            bold.className = 'font-semibold text-gray-900';
            bold.textContent = match[1];
            parentElement.appendChild(bold);

            lastIndex = match.index + match[0].length;
          }

          if (lastIndex < part.length) {
            const remainingText = part.substring(lastIndex);
            if (remainingText) {
              parentElement.appendChild(document.createTextNode(remainingText));
            }
          }

          if (lastIndex === 0) {
            parentElement.appendChild(document.createTextNode(part));
          }
        }
      });
    };

    const lines = renderText.split('\n');
    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) {
        containerRef.current.appendChild(document.createElement('br'));
      }

      if (!line.trim() && lineIdx < lines.length - 1) {
        return;
      }

      if (line.trim().startsWith('##')) {
        const heading = document.createElement('h3');
        heading.className = 'text-lg font-bold mt-4 mb-2 text-gray-900';
        const headingText = line.replace(/^##\s+/, '');
        renderTextWithMarkdown(headingText, heading);
        containerRef.current.appendChild(heading);
      }
      else if (/^\d+\.\s+/.test(line.trim())) {
        const listItem = document.createElement('div');
        listItem.className = 'ml-4 my-1';
        const listText = line.replace(/^\d+\.\s+/, '');
        renderTextWithMarkdown(listText, listItem);
        containerRef.current.appendChild(listItem);
      }
      else if (/^-\s+/.test(line.trim())) {
        const listItem = document.createElement('div');
        listItem.className = 'ml-4 my-1';
        const listText = '• ' + line.replace(/^-\s+/, '');
        renderTextWithMarkdown(listText, listItem);
        containerRef.current.appendChild(listItem);
      }
      else if (line.trim()) {
        const paragraph = document.createElement('div');
        paragraph.className = 'leading-relaxed my-1';
        renderTextWithMarkdown(line, paragraph);
        containerRef.current.appendChild(paragraph);
      }
    });
  }, [text]);

  return <div ref={containerRef} className="text-gray-800 leading-relaxed" />;
};

const AIChatPopup = ({ apiKey, user, onClose }) => {
  const {
    isVoiceActive,
    isRecording: contextIsRecording,
    transcript: contextTranscript,
    audioLevel: contextAudioLevel,
    startVoiceChat,
    stopVoiceChat,
    toggleRecording,
    setTranscript: setContextTranscript,
    setAudioLevel: setContextAudioLevel,
  } = useVoiceChat();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isLiveVoice, setIsLiveVoice] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  
  const scrollRef = useRef(null);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const headerCanvasRef = useRef(null);
  const speechRecognitionRef = useRef(null);
  const audioVisualizerRef = useRef(null);
  const headerVisualizerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Welcome message
  useEffect(() => {
    const welcomeMessage = {
      role: 'model',
      text: '👋 Chào bạn! Mình là Anh Thơ, bạn học cùng lớp của bạn. Mình rất vui được giúp đỡ bạn trong việc học tập!\n\nMình có thể giúp bạn:\n\n📚 Giải bài tập các môn học\n💡 Ôn thi THPT hiệu quả\n📝 Soạn đề thi và luyện tập\n🔍 Tìm hiểu kiến thức mới\n💬 Thảo luận về các chủ đề học tập\n\nHãy hỏi mình bất cứ điều gì bạn muốn biết nhé! 😊',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  }, []);

  // Auto scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    });
  }, [messages, isLoading, isTyping]);

  // Initialize Speech Recognition
  useEffect(() => {
    speechRecognitionRef.current = new SpeechRecognitionService();
    speechRecognitionRef.current.onResult = ({ interim, final }) => {
      setTranscript(interim || final);
      if (final) {
        setInput(final);
      }
    };
    speechRecognitionRef.current.onError = (error) => {
      if (error === 'no-speech' || error === 'audio-capture') {
        setIsRecording(false);
        alert('Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.');
      }
    };
    speechRecognitionRef.current.onEnd = () => {
      setIsRecording(false);
    };

    return () => {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioVisualizerRef.current) {
        audioVisualizerRef.current.stop();
      }
      if (headerVisualizerRef.current) {
        headerVisualizerRef.current.stop();
      }
    };
  }, []);

  // Focus input
  useEffect(() => {
    if (!isLiveVoice) {
      inputRef.current?.focus();
    }
  }, [isLiveVoice]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Clear history
  const handleClearHistory = () => {
    if (!confirm('Bạn có chắc muốn xóa toàn bộ lịch sử trò chuyện?')) {
      return;
    }
    const welcomeMessage = {
      role: 'model',
      text: '👋 Chào bạn! Mình là Anh Thơ, bạn học cùng lớp của bạn. Mình rất vui được giúp đỡ bạn trong việc học tập!\n\nMình có thể giúp bạn:\n\n📚 Giải bài tập các môn học\n💡 Ôn thi THPT hiệu quả\n📝 Soạn đề thi và luyện tập\n🔍 Tìm hiểu kiến thức mới\n💬 Thảo luận về các chủ đề học tập\n\nHãy hỏi mình bất cứ điều gì bạn muốn biết nhé! 😊',
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);
  };

  // Send message
  const handleSend = async (customPrompt = null) => {
    const prompt = customPrompt || input.trim();
    if (!prompt) return;

    const userMessage = {
      role: 'user',
      text: prompt,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setIsTyping(true);

    try {
      const recentMessages = messages.slice(-10);
      const systemInstruction = `Bạn là Anh Thơ, một người bạn học cùng lớp rất hòa đồng, kiến thức sâu rộng và thông thái. Bạn luôn sẵn sàng giúp đỡ bạn học của mình trong việc học tập.

VỀ BẢN THÂN:
- Tự xưng là "mình" hoặc tên "Anh Thơ" (không dùng "tôi" hay "em")
- Tính cách: hòa đồng, thân thiện, nhiệt tình nhưng vẫn giữ được sự chuyên nghiệp
- Kiến thức: sâu rộng về tất cả các môn học THPT (Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Anh)
- Thông thái: có khả năng giải thích phức tạp thành đơn giản, dễ hiểu

PHẠM VI TRẢ LỜI:
- CHỈ trả lời các câu hỏi về HỌC TẬP, KIẾN THỨC THPT
- KHÔNG trả lời về: lập trình, code, programming, công nghệ thông tin (trừ khi liên quan đến học tập)
- KHÔNG trả lời về: giải trí, phim ảnh, game (trừ khi liên quan đến học tập)
- Nếu câu hỏi không liên quan học tập, từ chối lịch sự và hướng dẫn hỏi về học tập

YÊU CẦU VỀ VĂN PHONG TIẾNG VIỆT:
- Viết đúng ngữ pháp tiếng Việt, tự nhiên, dễ hiểu
- Sử dụng từ ngữ phù hợp với học sinh THPT
- Cấu trúc câu rõ ràng, logic, mạch lạc, tránh câu dài dòng
- Tránh ngôn ngữ quá trang trọng hoặc quá suồng sã
- Giải thích từng bước một cách có hệ thống, có thứ tự
- Sử dụng thuật ngữ chính xác theo chương trình THPT Việt Nam
- Trình bày như trong sách giáo khoa: có mục, có tiểu mục, có ví dụ minh họa cụ thể
- Sử dụng định dạng markdown TIẾT KIỆM: chỉ dùng ## cho tiêu đề chính, dùng số thứ tự (1., 2., 3.) cho danh sách
- QUAN TRỌNG: CHỈ dùng **bold** cho các TỪ HOẶC CỤM TỪ quan trọng như tên khái niệm, thuật ngữ chuyên môn (ví dụ: **hàm số**, **đạo hàm**, **phương trình bậc hai**). KHÔNG dùng **bold** cho toàn bộ câu, đoạn văn, hoặc các từ thông thường
- Ưu tiên dùng số thứ tự và xuống dòng để tạo cấu trúc thay vì dùng quá nhiều bold
- Tối ưu không gian: viết ngắn gọn, súc tích, không dài dòng
- Luôn viết bằng tiếng Việt, đảm bảo ngữ pháp đúng và tự nhiên

CẤU TRÚC TRẢ LỜI (ÁP DỤNG KHI CẦN THIẾT):
1. Giới thiệu ngắn gọn về chủ đề (1-2 câu, nếu cần)
2. Giải thích chi tiết với các bước rõ ràng, có số thứ tự
3. Ví dụ minh họa cụ thể, dễ hiểu (nếu có)
4. Tóm tắt hoặc Kết luận để người đọc dễ nhớ

LƯU Ý KỸ THUẬT:
- Công thức toán học, vật lý, hóa học PHẢI dùng LaTeX:
  - Inline: $x^2$, $\\frac{a}{b}$, $\\sqrt{x}$
  - Display mode: $$E = mc^2$$, $$\\int_0^1 f(x)dx$$
- Luôn kiểm tra tính chính xác của thông tin
- Nếu không chắc chắn, hãy nói rõ và đề xuất nguồn tham khảo
- Độ dài phù hợp: không quá ngắn (thiếu thông tin) nhưng cũng không quá dài (khó đọc)`;

      const contextPrompt = recentMessages.length > 0
        ? `${systemInstruction}\n\n**Lịch sử trò chuyện:**\n${recentMessages.map(m => `${m.role === 'user' ? 'Bạn' : 'Anh Thơ'}: ${m.text}`).join('\n')}\n\n**Câu hỏi mới:** ${prompt}\n\nHãy trả lời theo đúng yêu cầu về văn phong tiếng Việt và tính cách của Anh Thơ ở trên.`
        : `${systemInstruction}\n\n**Câu hỏi:** ${prompt}\n\nHãy trả lời theo đúng yêu cầu về văn phong tiếng Việt và tính cách của Anh Thơ ở trên.`;

      const response = await callGeminiAI(contextPrompt, null, apiKey);
      setIsTyping(false);

      let responseText = '';
      if (typeof response === 'string') {
        responseText = response;
      } else if (response && typeof response === 'object') {
        responseText = response.text || response.response || response.message || response.content || response.data;
        if (!responseText) {
          const findStringValue = (obj) => {
            for (const key in obj) {
              if (typeof obj[key] === 'string' && obj[key].length > 0) {
                return obj[key];
              }
              if (typeof obj[key] === 'object' && obj[key] !== null) {
                const found = findStringValue(obj[key]);
                if (found) return found;
              }
            }
            return null;
          };
          responseText = findStringValue(response) || 'Không có phản hồi từ AI.';
        }
      } else if (response !== null && response !== undefined) {
        responseText = String(response);
      } else {
        responseText = 'Không có phản hồi từ AI.';
      }

      if (responseText.startsWith('{') && responseText.includes('"answer"')) {
        try {
          const parsed = JSON.parse(responseText);
          if (parsed.answer) {
            responseText = parsed.answer;
          }
        } catch (e) {
          // Ignore
        }
      }

      const aiMessage = {
        role: 'model',
        text: responseText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        role: 'model',
        text: '❌ Xin lỗi, tôi gặp lỗi khi xử lý. Vui lòng thử lại sau!',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync local state với context
  useEffect(() => {
    if (isRecording) {
      toggleRecording(true);
      if (!isVoiceActive) {
        startVoiceChat();
      }
    }
    if (transcript) {
      setContextTranscript(transcript);
    }
    if (audioLevel > 0) {
      setContextAudioLevel(audioLevel);
    }
  }, [isRecording, transcript, audioLevel, toggleRecording, startVoiceChat, setContextTranscript, setContextAudioLevel, isVoiceActive]);

  // Toggle Live Voice
  const toggleLiveVoice = async () => {
    if (isLiveVoice) {
      if (isRecording) {
        await stopRecording();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (audioVisualizerRef.current) {
        audioVisualizerRef.current.stop();
      }
      if (headerVisualizerRef.current) {
        headerVisualizerRef.current.stop();
      }
      setIsLiveVoice(false);
      stopVoiceChat();
    } else {
      setIsLiveVoice(true);
      startVoiceChat();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;

        if (canvasRef.current) {
          if (!audioVisualizerRef.current) {
            audioVisualizerRef.current = new AudioVisualizer(canvasRef.current);
          }
          audioVisualizerRef.current.setup(stream);
        }

        if (headerCanvasRef.current) {
          if (!headerVisualizerRef.current) {
            headerVisualizerRef.current = new AudioVisualizer(headerCanvasRef.current);
          }
          headerVisualizerRef.current.setup(stream);
        }
      } catch (error) {
        alert('Không thể truy cập microphone. Vui lòng cho phép quyền truy cập.');
        setIsLiveVoice(false);
        stopVoiceChat();
      }
    }
  };

  // Start Recording
  const startRecording = async () => {
    if (!speechRecognitionRef.current?.isSupported()) {
      alert('Trình duyệt của bạn không hỗ trợ nhận diện giọng nói.');
      return;
    }

    try {
      speechRecognitionRef.current.start();
      setIsRecording(true);
      setTranscript('');
      toggleRecording(true);

      if (audioVisualizerRef.current) {
        audioVisualizerRef.current.start();
      }
      if (headerVisualizerRef.current) {
        headerVisualizerRef.current.start();
      }

      if (mediaStreamRef.current) {
        const options = { mimeType: 'audio/webm;codecs=opus' };
        const recorder = new MediaRecorder(mediaStreamRef.current, options);
        mediaRecorderRef.current = recorder;

        const audioChunks = [];

        recorder.ondataavailable = async (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
            try {
              const audioBlob = new Blob([event.data], { type: 'audio/webm' });
              const response = await voiceService.sendAudio(audioBlob);
              if (response && response.text) {
                const aiMessage = {
                  role: 'model',
                  text: response.text,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
              }
            } catch (error) {
              // Fallback to transcript
            }
          }
        };

        recorder.onstop = async () => {
          if (audioChunks.length > 0) {
            const finalBlob = new Blob(audioChunks, { type: 'audio/webm' });
            try {
              const response = await voiceService.sendAudio(finalBlob);
              if (response && response.text) {
                const aiMessage = {
                  role: 'model',
                  text: response.text,
                  timestamp: new Date()
                };
                setMessages(prev => [...prev, aiMessage]);
              }
            } catch (error) {
              // Ignore
            }
          }
        };

        recorder.start(1000);
      }
    } catch (error) {
      setIsRecording(false);
      toggleRecording(false);
    }
  };

  // Stop Recording
  const stopRecording = async () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    toggleRecording(false);

    if (audioVisualizerRef.current) {
      audioVisualizerRef.current.stop();
    }
    if (headerVisualizerRef.current) {
      headerVisualizerRef.current.stop();
    }

    const textToSend = transcript.trim() || input.trim();
    if (textToSend) {
      setTranscript('');
      setInput('');
      await handleSend(textToSend);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (!isVoiceActive && isRecording) {
        stopRecording();
      }
      if (!isVoiceActive && mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      if (!isVoiceActive && audioVisualizerRef.current) {
        audioVisualizerRef.current.stop();
      }
      if (!isVoiceActive && headerVisualizerRef.current) {
        headerVisualizerRef.current.stop();
      }
    };
  }, [isVoiceActive, isRecording]);

  const formatTime = (date) => {
    if (!date) return '';
    const now = new Date();
    const diff = now - new Date(date);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const handleBackdropClick = () => {
    if (isRecording && isVoiceActive) {
      onClose();
    } else {
      if (isLiveVoice) {
        stopVoiceChat();
      }
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[90vh] max-h-[900px] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Gemini Style */}
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Sparkles className="text-white" size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-gray-900 font-semibold text-sm truncate">Anh Thơ</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {isLiveVoice && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-50 rounded-full">
                    <Radio size={10} className="text-red-600 shrink-0" />
                    <span className="text-red-600 text-[10px] font-medium">Live</span>
                  </div>
                )}
                {(isLoading || isTyping) && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 rounded-full">
                    <MessageCircle size={10} className="text-blue-600 shrink-0" />
                    <span className="text-blue-600 text-[10px] font-medium">Đang trả lời...</span>
                  </div>
                )}
                {isRecording && isLiveVoice && headerCanvasRef.current && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 rounded-full">
                    <canvas
                      ref={headerCanvasRef}
                      width={50}
                      height={12}
                      className="h-3"
                    />
                  </div>
                )}
                {!isLiveVoice && !isLoading && !isTyping && (
                  <div className="flex items-center gap-1">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <span className="text-gray-500 text-[10px]">Sẵn sàng</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              title="Biểu cảm"
            >
              <Smile size={16} />
            </button>
            <button
              onClick={() => {
                if (isRecording && isVoiceActive) {
                  onClose();
                } else {
                  if (isLiveVoice) {
                    stopVoiceChat();
                  }
                  onClose();
                }
              }}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-600"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Messages Area */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 py-6 space-y-6 bg-white custom-scrollbar"
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'model' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <Bot className="text-white" size={16} />
                </div>
              )}
              
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'order-2' : ''}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <MessageContent 
                    text={typeof msg.text === 'string' ? msg.text : (msg.text?.toString() || '')} 
                  />
                </div>
                <div className={`text-[10px] text-gray-400 mt-1 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {formatTime(msg.timestamp)}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 order-3">
                  {user?.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-full h-full rounded-lg object-cover"
                    />
                  ) : (
                    <User className="text-white" size={16} />
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shrink-0">
                <Bot className="text-white" size={16} />
              </div>
              <div className="bg-gray-100 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Voice Indicator */}
        {isLiveVoice && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={40}
                  className="w-full h-10 rounded-lg bg-white border border-gray-200"
                />
                {!isRecording && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs text-gray-500">Nhấn nút micro để bắt đầu nói</p>
                  </div>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-red-600">Đang ghi âm</span>
                </div>
              )}
            </div>
            {transcript && (
              <div className="mt-2 p-2 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-700">{transcript}</p>
              </div>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200 shrink-0">
          <div className="flex gap-2 items-end">
            <button
              onClick={toggleLiveVoice}
              className={`p-2 rounded-lg transition-all shrink-0 ${
                isLiveVoice
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
              title={isLiveVoice ? 'Tắt trò chuyện trực tiếp' : 'Bật trò chuyện trực tiếp'}
            >
              {isLiveVoice ? <Radio size={16} /> : <Mic size={16} />}
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập câu hỏi của bạn..."
                className="w-full px-4 py-2.5 pr-10 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-100 resize-none text-sm transition-all min-h-[44px] max-h-32"
                rows={1}
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className={`absolute right-2 bottom-2 p-1.5 rounded-lg transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>

            {isLiveVoice && (
              <button
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-2.5 rounded-lg transition-all shrink-0 ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
                disabled={isLoading}
                title={isRecording ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}

            <button
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors shrink-0"
              title="Gửi ảnh"
              disabled={isLoading}
            >
              <ImageIcon size={16} />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-2 text-center">
            {isLiveVoice && isRecording 
              ? '🎤 Đang ghi âm... Nhấn lại để dừng' 
              : isLiveVoice 
                ? '💬 Bạn có thể vừa chat vừa nói chuyện trực tiếp' 
                : '💡 Nhấn Enter để gửi, Shift + Enter để xuống dòng'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChatPopup;
