import React from 'react';
import { Mic, MicOff, PhoneOff } from 'lucide-react';
import Waveform from './Waveform';
import { formatTime } from '../../../utils/formatTime';
import { AI_PERSONA } from '../../../config/aiConfig';

const LivePillHeader = ({ sessionTime, isListening, toggleListening, turnOffLive }) => (
  <div className="fixed top-16 left-0 right-0 h-16 z-50 flex items-center justify-center px-4 animate-in slide-in-from-top-2 duration-300 pointer-events-none">
    <div className="pointer-events-auto bg-gray-900 text-white rounded-full h-12 w-full max-w-md shadow-xl flex items-center justify-between px-1 pr-2 border border-gray-700 relative overflow-hidden mt-1 mx-2">
      <div className={`absolute inset-0 bg-gradient-to-r from-pink-500/30 to-purple-600/30 transition-opacity duration-500 ${isListening ? 'opacity-100' : 'opacity-0'}`}></div>
      
      <div className="flex items-center gap-3 relative z-10 pl-2">
        <div 
          onClick={toggleListening} 
          className={`w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-all border-2 border-white/10 ${
            isListening ? 'bg-red-500 text-white' : 'bg-gray-800 text-gray-400'
          }`}
        >
          {isListening ? <Mic size={16} className="animate-pulse"/> : <MicOff size={16}/>}
        </div>
        
        <div className="flex flex-col justify-center">
          <span className="text-[10px] font-bold text-pink-300 tracking-wider uppercase leading-none mb-0.5 flex items-center gap-1">
            {AI_PERSONA.name} <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium leading-none">{formatTime(sessionTime)}</span>
            <Waveform active={isListening} height="h-3" />
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 relative z-10">
        <button 
          onClick={turnOffLive} 
          className="w-9 h-9 rounded-full bg-white/10 hover:bg-red-500/20 text-gray-300 hover:text-red-500 flex items-center justify-center transition-colors"
        >
          <PhoneOff size={18} fill="currentColor" />
        </button>
      </div>
    </div>
  </div>
);

export default LivePillHeader;

