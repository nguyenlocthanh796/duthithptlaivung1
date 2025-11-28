import React from 'react';

const Waveform = ({ active, color = "bg-white", height = "h-4" }) => (
  <>
    <div className={`flex items-center gap-[3px] ${height}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div 
          key={i} 
          className={`w-[3px] rounded-full transition-all duration-300 ${color} ${active ? 'animate-music-bar' : 'h-[3px]'}`} 
          style={{ 
            height: active ? undefined : '3px', 
            animationDelay: `${i * 0.1}s`, 
            animationDuration: '0.8s' 
          }}
        />
      ))}
    </div>
    <style>{`
      @keyframes music-bar { 
        0%, 100% { height: 20%; opacity: 0.5; } 
        50% { height: 100%; opacity: 1; } 
      } 
      .animate-music-bar { 
        animation: music-bar 0.8s ease-in-out infinite; 
      }
    `}</style>
  </>
);

export default Waveform;

