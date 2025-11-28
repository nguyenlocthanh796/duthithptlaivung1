import React from 'react';
import { Maximize2, Sparkles, Bot } from 'lucide-react';
import { AI_PERSONA } from '../../../config/aiConfig';

const ChatHeader = ({ isLiveMode, onToggleLive }) => (
  <div className="px-6 py-3 border-b border-gray-100 flex items-center justify-between bg-white/80 backdrop-blur-sm z-10 sticky top-0">
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center shadow-lg border-2 border-white">
        <Sparkles size={18} className="text-white" />
      </div>
      <div>
        <div className="font-bold text-gray-800 flex items-center gap-2">
          {AI_PERSONA.name}
          <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-medium border border-green-200">
            Online
          </span>
        </div>
        <div className="text-xs text-gray-500">
          {AI_PERSONA.role} • DuThi LaiVung1
        </div>
      </div>
    </div>
    
    <button 
      onClick={onToggleLive} 
      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg group active:scale-95 ${
        isLiveMode 
          ? 'bg-red-500 text-white shadow-red-200' 
          : 'bg-gray-900 hover:bg-black text-white shadow-gray-200'
      }`}
    >
      {isLiveMode ? (
        <>
          <span className="animate-pulse w-2 h-2 bg-white rounded-full"></span>
          Đang Live
        </>
      ) : (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          Gọi Anh Thơ 
          <Maximize2 size={14} className="group-hover:translate-x-0.5 transition-transform ml-1"/>
        </>
      )}
    </button>
  </div>
);

export default ChatHeader;

