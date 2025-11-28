import React from 'react';
import { X, Mic, MicOff, Keyboard, PhoneOff, Headphones } from 'lucide-react';
import Waveform from './Waveform';
import { formatTime } from '../../../utils/formatTime';
import { AI_PERSONA } from '../../../config/aiConfig';

const LivePanel = ({ 
  sessionTime, 
  isListening, 
  toggleListening, 
  turnOffLive 
}) => (
  <div className="flex flex-col h-full bg-[#0B0F19] text-white shadow-2xl relative overflow-hidden rounded-2xl">
    <button 
      onClick={turnOffLive} 
      className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white z-20"
    >
      <X size={20}/>
    </button>
    
    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <img 
          src={AI_PERSONA.avatar} 
          className="w-8 h-8 rounded-full border border-white/20 bg-white/10" 
          alt="AI"
        />
        <div>
          <div className="font-bold tracking-wide text-sm text-pink-400">{AI_PERSONA.name}</div>
          <div className="text-[10px] text-gray-400">{AI_PERSONA.role}</div>
        </div>
      </div>
      <span className="font-mono text-gray-400 text-xs bg-white/10 px-2 py-1 rounded">
        {formatTime(sessionTime)}
      </span>
    </div>
    
    <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div 
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-600/20 blur-[60px] rounded-full transition-all duration-700 ${
          isListening ? 'scale-150 opacity-100' : 'scale-100 opacity-50'
        }`}
      ></div>
      
      <div 
        onClick={toggleListening} 
        className={`relative z-10 w-40 h-40 rounded-full border border-white/10 flex items-center justify-center cursor-pointer transition-all duration-500 group ${
          isListening 
            ? 'shadow-[0_0_40px_rgba(236,72,153,0.3)] bg-white/5' 
            : 'bg-transparent'
        }`}
      >
        <div 
          className={`absolute inset-0 rounded-full border border-white/20 transition-transform duration-1000 ${
            isListening ? 'animate-[spin_4s_linear_infinite]' : 'scale-90 opacity-50'
          }`} 
          style={{borderStyle: 'dashed'}}
        ></div>
        {isListening ? (
          <Waveform active={true} height="h-12" color="bg-pink-400"/>
        ) : (
          <Headphones size={40} className="text-gray-400 group-hover:text-white transition-colors"/>
        )}
      </div>
      
      <p className="mt-8 text-center text-gray-400 text-sm">
        {isListening ? AI_PERSONA.listening : "Nhấn vào vòng tròn để gọi Thơ nhé!"}
      </p>
    </div>
    
    <div className="p-6 border-t border-gray-800 bg-black/20">
      <div className="grid grid-cols-3 gap-4">
        <button 
          onClick={toggleListening} 
          className={`p-4 rounded-xl flex items-center justify-center transition-all ${
            isListening 
              ? 'bg-white text-black' 
              : 'bg-white/10 text-white hover:bg-white/20'
          }`}
        >
          {isListening ? <MicOff size={20}/> : <Mic size={20}/>}
        </button>
        
        {/* Nút Chat để chuyển về chế độ Text khi đang Live trên Desktop */}
        <button 
          onClick={turnOffLive} 
          className="p-4 rounded-xl bg-white/10 text-white hover:bg-white/20 flex items-center justify-center transition-all"
        >
          <Keyboard size={20}/>
        </button>
        
        <button 
          onClick={turnOffLive} 
          className="p-4 rounded-xl bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all"
        >
          <PhoneOff size={20} fill="currentColor"/>
        </button>
      </div>
    </div>
  </div>
);

export default LivePanel;

