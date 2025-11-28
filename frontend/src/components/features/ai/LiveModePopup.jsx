import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, PhoneOff, Headphones, Sparkles } from 'lucide-react';
import Waveform from './Waveform';
import { formatTime } from '../../../utils/formatTime';
import { AI_PERSONA } from '../../../config/aiConfig';

const LiveModePopup = ({ 
  sessionTime, 
  isListening, 
  toggleListening, 
  turnOffLive 
}) => {
  const [emojiExpression, setEmojiExpression] = useState('😌');
  
  // Thay đổi emoji theo tâm trạng
  useEffect(() => {
    if (isListening) {
      setEmojiExpression('😊');
    } else {
      setEmojiExpression('😌');
    }
  }, [isListening]);
  
  return (
  <div className="fixed right-4 top-20 w-80 bg-[#0B0F19] text-white shadow-2xl rounded-2xl border border-gray-800 z-50 overflow-hidden animate-in slide-in-from-right-2 duration-300">
    {/* Header */}
    <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-black/20">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full border border-white/20 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg">
          <Sparkles size={16} className="text-white" />
        </div>
        <div>
          <div className="font-bold tracking-wide text-sm text-pink-400">{AI_PERSONA.name}</div>
          <div className="text-[10px] text-gray-400">{AI_PERSONA.role}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono text-gray-400 text-xs bg-white/10 px-2 py-1 rounded">
          {formatTime(sessionTime)}
        </span>
        <button 
          onClick={turnOffLive} 
          className="p-1.5 text-gray-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>
    </div>
    
    {/* Visualizer Area với 3D Avatar */}
    <div className="p-6 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-b from-black/20 to-transparent">
      {/* Background glow - thay đổi màu theo tâm trạng */}
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 blur-[50px] rounded-full transition-all duration-700 ${
          isListening 
            ? 'bg-pink-500/40 scale-150 opacity-100' 
            : 'bg-blue-500/30 scale-100 opacity-60'
        }`}
        style={{
          animation: isListening ? 'pulse-glow 2s ease-in-out infinite' : 'none'
        }}
      ></div>
      
      {/* 3D Anime Avatar Container với biểu cảm sống động */}
      <div 
        onClick={toggleListening} 
        className="relative z-10 cursor-pointer group anime-avatar-container"
        style={{ 
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* 3D Anime Card Effect */}
        <div 
          className="relative w-32 h-32 rounded-2xl transition-all duration-500 anime-avatar-card"
          style={{
            transformStyle: 'preserve-3d',
            transform: isListening 
              ? 'perspective(1000px) rotateY(12deg) rotateX(5deg) scale(1.05)' 
              : 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)',
            background: isListening 
              ? 'linear-gradient(135deg, rgba(236,72,153,0.3) 0%, rgba(168,85,247,0.3) 100%)'
              : 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(147,51,234,0.3) 100%)',
            border: `2px solid ${isListening ? 'rgba(236,72,153,0.5)' : 'rgba(59,130,246,0.5)'}`,
            boxShadow: isListening 
              ? '0 20px 60px rgba(236,72,153,0.4), inset 0 0 30px rgba(236,72,153,0.1)'
              : '0 10px 30px rgba(59,130,246,0.3), inset 0 0 20px rgba(59,130,246,0.1)',
            willChange: 'transform',
            animation: 'float-gentle 3s ease-in-out infinite'
          }}
        >
          {/* Avatar Image với 3D anime effect */}
          <div 
            className="absolute inset-0 rounded-2xl overflow-hidden anime-face"
            style={{
              transform: 'translateZ(20px)',
              filter: isListening ? 'brightness(1.2) saturate(1.3)' : 'brightness(1) saturate(1)',
              transition: 'filter 0.5s ease',
              animation: isListening ? 'excited-pulse 1.5s ease-in-out infinite' : 'idle-breathe 4s ease-in-out infinite'
            }}
          >
            <img 
              src={AI_PERSONA.avatar} 
              alt="AI Avatar"
              className="w-full h-full object-cover transition-all duration-500 anime-avatar-img"
              style={{
                transform: isListening ? 'scale(1.1) rotateZ(2deg)' : 'scale(1) rotateZ(0deg)',
                display: 'block',
                animation: isListening ? 'listening-glow 2s ease-in-out infinite' : 'gentle-glow 3s ease-in-out infinite'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                if (!parent.querySelector('.avatar-fallback')) {
                  const fallback = document.createElement('div');
                  fallback.className = 'avatar-fallback w-full h-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center rounded-2xl anime-fallback overflow-hidden';
                  fallback.style.animation = 'idle-breathe 4s ease-in-out infinite';
                  
                  // Tạo emoji động thay vì text
                  const emojiContainer = document.createElement('div');
                  emojiContainer.className = 'w-full h-full flex items-center justify-center text-5xl';
                  emojiContainer.style.animation = 'emoji-bounce 2s ease-in-out infinite';
                  
                  const emoji = document.createElement('span');
                  emoji.textContent = emojiExpression;
                  emoji.className = 'animated-emoji';
                  emoji.style.display = 'inline-block';
                  emoji.style.animation = 'emoji-rotate 3s ease-in-out infinite, emoji-pulse 2s ease-in-out infinite';
                  emoji.style.filter = 'drop-shadow(0 4px 12px rgba(255,255,255,0.5))';
                  emoji.style.fontSize = '3rem';
                  emoji.style.lineHeight = '1';
                  
                  // Cập nhật emoji theo tâm trạng - sử dụng closure để truy cập isListening
                  const currentListening = isListening;
                  const updateEmoji = () => {
                    // Kiểm tra lại trạng thái từ DOM hoặc sử dụng currentListening
                    const listeningState = currentListening; // Có thể cải thiện bằng cách check từ DOM
                    if (listeningState) {
                      const expressions = ['😊', '😄', '😃', '🤗'];
                      emoji.textContent = expressions[Math.floor(Math.random() * expressions.length)];
                    } else {
                      const expressions = ['😌', '🙂', '😊'];
                      emoji.textContent = expressions[Math.floor(Math.random() * expressions.length)];
                    }
                  };
                  
                  // Thay đổi emoji mỗi 2-3 giây
                  const emojiInterval = setInterval(updateEmoji, 2500);
                  
                  // Cleanup khi component unmount
                  const cleanup = () => {
                    clearInterval(emojiInterval);
                  };
                  
                  // Lưu cleanup function để có thể gọi sau
                  fallback._cleanup = cleanup;
                  
                  emojiContainer.appendChild(emoji);
                  fallback.appendChild(emojiContainer);
                  parent.appendChild(fallback);
                }
              }}
            />
            
            {/* Anime Eyes - Nhấp nháy mắt */}
            <div className="absolute inset-0 pointer-events-none anime-eyes">
              <div 
                className="absolute top-[35%] left-[30%] w-2 h-2 bg-white rounded-full opacity-80"
                style={{
                  animation: 'blink 3s ease-in-out infinite',
                  boxShadow: isListening ? '0 0 8px rgba(255,255,255,0.8)' : '0 0 4px rgba(255,255,255,0.6)'
                }}
              ></div>
              <div 
                className="absolute top-[35%] right-[30%] w-2 h-2 bg-white rounded-full opacity-80"
                style={{
                  animation: 'blink 3s ease-in-out infinite',
                  animationDelay: '0.1s',
                  boxShadow: isListening ? '0 0 8px rgba(255,255,255,0.8)' : '0 0 4px rgba(255,255,255,0.6)'
                }}
              ></div>
            </div>
            
            {/* Expression Overlay - Biểu cảm theo tâm trạng */}
            <div 
              className={`absolute inset-0 transition-all duration-500 pointer-events-none anime-expression ${
                isListening 
                  ? 'bg-gradient-to-br from-pink-500/30 to-purple-600/30' 
                  : 'bg-gradient-to-br from-blue-500/20 to-indigo-600/20'
              }`}
              style={{
                animation: isListening ? 'excited-shimmer 2s ease-in-out infinite' : 'calm-shimmer 4s ease-in-out infinite'
              }}
            ></div>
            
            {/* Sparkle effects - Hiệu ứng lấp lánh */}
            {isListening && (
              <>
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-white rounded-full pointer-events-none"
                    style={{
                      top: `${20 + i * 20}%`,
                      left: `${25 + i * 15}%`,
                      animation: `sparkle ${1.5 + i * 0.2}s ease-in-out infinite`,
                      animationDelay: `${i * 0.3}s`,
                      boxShadow: '0 0 6px rgba(255,255,255,0.9)'
                    }}
                  ></div>
                ))}
              </>
            )}
          </div>
          
          {/* Animated border ring với hiệu ứng anime */}
          <div 
            className={`absolute inset-0 rounded-2xl border-2 transition-all duration-1000 pointer-events-none anime-border ${
              isListening ? 'border-pink-400/60' : 'border-blue-400/40'
            }`}
            style={{
              transform: 'translateZ(-10px)',
              animation: isListening ? 'spin-glow 8s linear infinite' : 'gentle-rotate 12s linear infinite',
              boxShadow: isListening 
                ? '0 0 20px rgba(236,72,153,0.5), inset 0 0 20px rgba(236,72,153,0.2)'
                : '0 0 10px rgba(59,130,246,0.3), inset 0 0 10px rgba(59,130,246,0.1)'
            }}
          ></div>
          
          {/* Floating particles effect khi listening - Anime style */}
          {isListening && (
            <>
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full bg-pink-400/60 pointer-events-none anime-particle"
                  style={{
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${i * 45}deg) translateY(-60px)`,
                    animation: `float-particle-anime ${2 + i * 0.2}s ease-in-out infinite`,
                    animationDelay: `${i * 0.15}s`,
                    boxShadow: '0 0 8px rgba(236,72,153,0.8)'
                  }}
                ></div>
              ))}
            </>
          )}
          
          {/* Aura effect - Hào quang xung quanh */}
          <div 
            className={`absolute -inset-4 rounded-2xl pointer-events-none anime-aura ${
              isListening ? 'bg-pink-500/20' : 'bg-blue-500/10'
            }`}
            style={{
              transform: 'translateZ(-30px)',
              animation: isListening ? 'aura-pulse 2s ease-in-out infinite' : 'aura-gentle 4s ease-in-out infinite',
              filter: 'blur(8px)'
            }}
          ></div>
        </div>
        
        {/* Status indicator với animation anime */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div 
            className={`w-3 h-3 rounded-full transition-all duration-300 anime-status ${
              isListening ? 'bg-pink-400 shadow-lg shadow-pink-400/50' : 'bg-blue-400'
            }`}
            style={{
              animation: isListening ? 'status-pulse 1s ease-in-out infinite' : 'status-gentle 2s ease-in-out infinite',
              boxShadow: isListening 
                ? '0 0 12px rgba(236,72,153,0.8), 0 0 24px rgba(236,72,153,0.4)'
                : '0 0 8px rgba(59,130,246,0.6)'
            }}
          ></div>
        </div>
      </div>
      
      {/* Waveform hoặc Icon */}
      <div className="mt-6 relative z-10">
        {isListening ? (
          <Waveform active={true} height="h-6" color="bg-pink-400"/>
        ) : (
          <Headphones size={24} className="text-gray-400 group-hover:text-white transition-colors mx-auto"/>
        )}
      </div>
      
      <p className="mt-4 text-center text-gray-400 text-xs transition-colors duration-300">
        {isListening ? (
          <span className="text-pink-300 font-medium">{AI_PERSONA.listening}</span>
        ) : (
          <span className="text-blue-300">Nhấn để gọi Thơ</span>
        )}
      </p>
      
      {/* CSS Animations - Anime Style */}
      <style>{`
        /* Background glow pulse */
        @keyframes pulse-glow {
          0%, 100% { 
            opacity: 0.6; 
            transform: translate(-50%, -50%) scale(1);
          }
          50% { 
            opacity: 1; 
            transform: translate(-50%, -50%) scale(1.2);
          }
        }
        
        /* Floating animation - Nhẹ nhàng như anime */
        @keyframes float-gentle {
          0%, 100% { 
            transform: translateY(0px) rotateY(0deg);
          }
          50% { 
            transform: translateY(-8px) rotateY(2deg);
          }
        }
        
        /* Breathing animation khi idle */
        @keyframes idle-breathe {
          0%, 100% { 
            transform: scale(1);
            filter: brightness(1) saturate(1);
          }
          50% { 
            transform: scale(1.02);
            filter: brightness(1.05) saturate(1.1);
          }
        }
        
        /* Excited pulse khi listening */
        @keyframes excited-pulse {
          0%, 100% { 
            transform: scale(1);
          }
          25% { 
            transform: scale(1.03);
          }
          50% { 
            transform: scale(1.05);
          }
          75% { 
            transform: scale(1.03);
          }
        }
        
        /* Gentle glow animation */
        @keyframes gentle-glow {
          0%, 100% { 
            filter: brightness(1) saturate(1) drop-shadow(0 0 8px rgba(255,255,255,0.3));
          }
          50% { 
            filter: brightness(1.1) saturate(1.1) drop-shadow(0 0 12px rgba(255,255,255,0.5));
          }
        }
        
        /* Listening glow animation */
        @keyframes listening-glow {
          0%, 100% { 
            filter: brightness(1.2) saturate(1.3) drop-shadow(0 0 15px rgba(236,72,153,0.6));
          }
          50% { 
            filter: brightness(1.3) saturate(1.4) drop-shadow(0 0 20px rgba(236,72,153,0.8));
          }
        }
        
        /* Blink animation - Nhấp nháy mắt */
        @keyframes blink {
          0%, 90%, 100% { 
            opacity: 0.8;
            transform: scaleY(1);
          }
          92%, 98% { 
            opacity: 0.1;
            transform: scaleY(0.1);
          }
        }
        
        /* Expression shimmer */
        @keyframes excited-shimmer {
          0%, 100% { 
            opacity: 0.3;
            transform: translateX(-10px);
          }
          50% { 
            opacity: 0.5;
            transform: translateX(10px);
          }
        }
        
        @keyframes calm-shimmer {
          0%, 100% { 
            opacity: 0.2;
          }
          50% { 
            opacity: 0.3;
          }
        }
        
        /* Sparkle animation */
        @keyframes sparkle {
          0%, 100% { 
            opacity: 0;
            transform: scale(0) rotate(0deg);
          }
          50% { 
            opacity: 1;
            transform: scale(1.5) rotate(180deg);
          }
        }
        
        /* Border animations */
        @keyframes spin-glow {
          from { 
            transform: rotate(0deg);
            filter: brightness(1);
          }
          to { 
            transform: rotate(360deg);
            filter: brightness(1.2);
          }
        }
        
        @keyframes gentle-rotate {
          from { 
            transform: rotate(0deg);
          }
          to { 
            transform: rotate(360deg);
          }
        }
        
        /* Particle animations */
        @keyframes float-particle-anime {
          0%, 100% { 
            opacity: 0.6; 
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-60px) scale(1);
          }
          50% { 
            opacity: 1; 
            transform: translate(-50%, -50%) rotate(var(--rotation, 0deg)) translateY(-80px) scale(1.3);
          }
        }
        
        /* Aura animations */
        @keyframes aura-pulse {
          0%, 100% { 
            opacity: 0.2;
            transform: scale(1);
          }
          50% { 
            opacity: 0.4;
            transform: scale(1.1);
          }
        }
        
        @keyframes aura-gentle {
          0%, 100% { 
            opacity: 0.1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.15;
            transform: scale(1.05);
          }
        }
        
        /* Status indicator animations */
        @keyframes status-pulse {
          0%, 100% { 
            opacity: 1;
            transform: scale(1);
          }
          50% { 
            opacity: 0.7;
            transform: scale(1.2);
          }
        }
        
        @keyframes status-gentle {
          0%, 100% { 
            opacity: 0.8;
            transform: scale(1);
          }
          50% { 
            opacity: 1;
            transform: scale(1.1);
          }
        }
        
        /* Emoji animations */
        @keyframes emoji-bounce {
          0%, 100% { 
            transform: translateY(0px) scale(1);
          }
          50% { 
            transform: translateY(-5px) scale(1.1);
          }
        }
        
        @keyframes emoji-rotate {
          0%, 100% { 
            transform: rotate(0deg);
          }
          25% { 
            transform: rotate(-5deg);
          }
          75% { 
            transform: rotate(5deg);
          }
        }
        
        /* Animated emoji với nhiều biểu cảm */
        @keyframes emoji-pulse {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 4px 12px rgba(255,255,255,0.5));
          }
          50% { 
            transform: scale(1.15);
            filter: drop-shadow(0 6px 16px rgba(255,255,255,0.7));
          }
        }
        
        .animated-emoji {
          user-select: none;
          pointer-events: none;
        }
      `}</style>
    </div>
    
    {/* Controls */}
    <div className="p-4 border-t border-gray-800 bg-black/20">
      <div className="grid grid-cols-2 gap-2">
        <button 
          onClick={toggleListening} 
          className={`p-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-medium ${
            isListening 
              ? 'bg-white text-black' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isListening ? <MicOff size={18}/> : <Mic size={18}/>}
          <span>{isListening ? 'Dừng' : 'Nói'}</span>
        </button>
        
        <button 
          onClick={turnOffLive} 
          className="p-3 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center gap-2 transition-all text-sm font-medium"
        >
          <PhoneOff size={18} fill="currentColor"/>
          <span>Kết thúc</span>
        </button>
      </div>
    </div>
  </div>
  );
};

export default LiveModePopup;

