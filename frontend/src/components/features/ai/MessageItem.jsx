import React from 'react';
import { Sparkles } from 'lucide-react';
import { AI_PERSONA } from '../../../config/aiConfig';
import { KatexRenderer } from '../../ui';

const MessageItem = ({ message, user }) => {
  const isAI = message.role === 'ai' || message.role === 'assistant';

  return (
    <div 
      className={`flex w-full ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <div className={`flex max-w-[90%] sm:max-w-[75%] gap-3 ${isAI ? 'flex-row' : 'flex-row-reverse'}`}>
        <div 
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border ${
            isAI 
              ? 'bg-gradient-to-br from-pink-400 to-purple-500 border-pink-200 shadow-lg' 
              : 'border-2 border-white shadow-sm overflow-hidden'
          }`}
        >
          {isAI ? (
            <Sparkles size={isAI ? 18 : 20} className="text-white" />
          ) : (
            <>
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="User" 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    const parent = e.target.parentElement;
                    if (!parent.querySelector('.avatar-fallback')) {
                      const fallback = document.createElement('div');
                      fallback.className = 'avatar-fallback w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold rounded-full';
                      const initials = user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
                      fallback.textContent = initials;
                      parent.appendChild(fallback);
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold rounded-full">
                  {user?.displayName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
                </div>
              )}
            </>
          )}
        </div>
        
        <div 
          className={`p-4 rounded-2xl shadow-sm text-sm sm:text-base leading-relaxed ${
            isAI 
              ? 'bg-white border border-gray-100 text-gray-800 rounded-tl-none' 
              : 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-none shadow-blue-200'
          }`}
        >
          <div className="whitespace-pre-wrap">
            <KatexRenderer 
              text={message.content} 
              className={isAI ? 'text-gray-800' : 'text-white'}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;

