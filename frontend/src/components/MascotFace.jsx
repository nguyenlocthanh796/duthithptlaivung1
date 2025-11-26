import { Smile } from 'lucide-react'

export function MascotFace({ status }) {
  const isBlinking = status === 'idle' || status === 'speaking'
  const isMouthMoving = status === 'speaking'
  const isThinking = status === 'processing' || status === 'processing_audio'

  return (
    <div className={`
      relative w-40 h-40 rounded-[3rem] shadow-2xl transition-all duration-500
      ${status === 'listening' ? 'bg-indigo-500 scale-110 shadow-indigo-300' : 
        status === 'speaking' ? 'bg-pink-400 scale-105 shadow-pink-300' : 
        isThinking ? 'bg-yellow-400 animate-pulse' : 'bg-blue-400'}
      flex flex-col items-center justify-center border-4 border-white/30
    `}>
      <div className="flex gap-6 mb-4">
        <div className={`w-8 h-8 bg-white rounded-full relative overflow-hidden transition-all duration-300 ${status === 'listening' ? 'h-10 w-10' : ''}`}>
          <div className={`absolute top-1/3 left-1/3 w-2 h-2 bg-black rounded-full ${isThinking ? 'animate-bounce' : ''}`}></div>
          {isBlinking && <div className="absolute inset-0 bg-blue-400/0 animate-[blink_4s_infinite]"></div>} 
        </div>
        <div className={`w-8 h-8 bg-white rounded-full relative overflow-hidden transition-all duration-300 ${status === 'listening' ? 'h-10 w-10' : ''}`}>
          <div className={`absolute top-1/3 left-1/3 w-2 h-2 bg-black rounded-full ${isThinking ? 'animate-bounce delay-100' : ''}`}></div>
          {isBlinking && <div className="absolute inset-0 bg-blue-400/0 animate-[blink_4s_infinite]"></div>}
        </div>
      </div>
      <div className={`transition-all duration-300 bg-white/90 ${status === 'listening' ? 'w-4 h-4 rounded-full' : isMouthMoving ? 'w-8 h-4 rounded-[1rem] animate-[talk_0.3s_infinite_alternate]' : isThinking ? 'w-6 h-1 rounded-full' : 'w-8 h-4 rounded-b-full'}`}></div>
      <div className="absolute top-20 left-4 w-3 h-2 bg-pink-300/50 rounded-full blur-sm"></div>
      <div className="absolute top-20 right-4 w-3 h-2 bg-pink-300/50 rounded-full blur-sm"></div>
      <style>{`
        @keyframes blink { 
          0%, 96%, 100% { height: 100%; top: 0; background: transparent; } 
          98% { height: 100%; background: #222; transform: scaleY(0.1); } 
        }
        @keyframes talk { 
          0% { height: 4px; width: 20px; border-radius: 4px; } 
          100% { height: 16px; width: 24px; border-radius: 12px; } 
        }
      `}</style>
    </div>
  )
}

