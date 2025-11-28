import React from 'react';
import { Send, Mic, Paperclip, Image as ImageIcon } from 'lucide-react';

const ChatInput = ({ 
  input, 
  setInput, 
  onSend, 
  onToggleLive,
  isLiveMode 
}) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  
  return (
    <div className={`p-4 bg-white border-t border-gray-100 sticky bottom-0 z-20 ${isLiveMode && isMobile ? 'mb-safe pb-4' : ''}`}>
      <div className="max-w-4xl mx-auto relative">
        <div className={`flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-[28px] p-2 pl-4 focus-within:ring-2 focus-within:ring-purple-100 focus-within:border-purple-300 focus-within:bg-white transition-all shadow-sm ${isLiveMode ? 'border-purple-200 bg-purple-50/50' : ''}`}>
          <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors mb-0.5">
            <Paperclip size={20} />
          </button>
          
          <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors mb-0.5">
            <ImageIcon size={20} />
          </button>
          
          <textarea 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { 
              if(e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                onSend(input); 
                setInput(''); 
              }
            }}
            placeholder={isLiveMode ? "Nhập để chat khi đang Live..." : "Hỏi bài tập, giải đề, viết văn..."}
            className="flex-1 bg-transparent border-none focus:ring-0 max-h-32 min-h-[44px] py-3 text-gray-700 placeholder-gray-400 resize-none custom-scrollbar"
            rows={1}
          />
          
          {input.trim() ? (
            <button 
              onClick={() => { 
                onSend(input); 
                setInput(''); 
              }} 
              className="p-3 mb-0.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-105 transition-all"
            >
              <Send size={18} className="ml-0.5" />
            </button>
          ) : (
            <button 
              onClick={onToggleLive} 
              className={`p-3 mb-0.5 rounded-full transition-colors ${isLiveMode ? 'bg-red-50 text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-800 hover:bg-gray-200'}`} 
              title="Chế độ giọng nói"
            >
              <Mic size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;

