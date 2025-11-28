import React from 'react';
import { AI_PERSONA } from '../../../config/aiConfig';

const ThinkingIndicator = () => (
  <div className="flex w-full justify-start animate-in fade-in">
    <div className="flex max-w-[90%] gap-3 flex-row">
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 border bg-white border-pink-100 shadow-sm p-0.5">
        <img 
          src={AI_PERSONA.avatar} 
          alt="AI" 
          className="w-full h-full object-cover rounded-full"
        />
      </div>
      
      <div className="p-4 rounded-2xl bg-white border border-gray-100 text-gray-800 rounded-tl-none flex items-center gap-2">
        <span className="text-gray-500 text-xs italic">{AI_PERSONA.thinking}</span>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
      </div>
    </div>
  </div>
);

export default ThinkingIndicator;

