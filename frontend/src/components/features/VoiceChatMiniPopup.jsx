import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Maximize2 } from 'lucide-react';
import { useVoiceChat } from '../../contexts/VoiceChatContext';

const VoiceChatMiniPopup = ({ onOpenFullPopup, onStopRecording }) => {
  const { isVoiceActive, isRecording, transcript, audioLevel, stopVoiceChat } = useVoiceChat();
  const [isExpanded, setIsExpanded] = useState(false);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Animate audio waves
  useEffect(() => {
    if (!isRecording || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      if (!isRecording) return;

      ctx.clearRect(0, 0, width, height);
      
      // Tạo sóng âm đơn giản
      const time = Date.now() * 0.005;
      const bars = 8;
      const barWidth = width / bars;

      for (let i = 0; i < bars; i++) {
        const barHeight = (Math.sin(time + i * 0.5) * 0.5 + 0.5) * height * 0.8;
        const x = i * barWidth;
        
        const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#8b5cf6');
        gradient.addColorStop(1, '#6366f1');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, height - barHeight, barWidth - 2, barHeight);
      }

      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRecording]);

  if (!isVoiceActive) return null;

  return (
    <div
      className={`fixed bottom-4 right-4 z-[90] transition-all duration-300 ${
        isExpanded ? 'w-80' : 'w-16'
      }`}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-purple-200 overflow-hidden">
        {/* Compact Mode */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-16 h-16 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-center rounded-2xl relative group hover:scale-105 transition-transform"
          >
            {isRecording ? (
              <>
                <canvas
                  ref={canvasRef}
                  width={64}
                  height={64}
                  className="absolute inset-0"
                />
                <Mic className="text-white relative z-10" size={24} />
                <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </>
            ) : (
              <MicOff className="text-white" size={24} />
            )}
          </button>
        )}

        {/* Expanded Mode */}
        {isExpanded && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Mic className="text-white" size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Anh Thơ</h4>
                  <p className="text-xs text-gray-500">
                    {isRecording ? 'Đang nghe...' : 'Sẵn sàng'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onOpenFullPopup}
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Mở cửa sổ chat"
                >
                  <Maximize2 size={16} className="text-gray-600" />
                </button>
                <button
                  onClick={() => {
                    stopVoiceChat();
                    onStopRecording?.();
                    setIsExpanded(false);
                  }}
                  className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                  title="Tắt voice chat"
                >
                  <X size={16} className="text-red-600" />
                </button>
              </div>
            </div>

            {/* Audio Visualizer */}
            {isRecording && (
              <div className="mb-3">
                <canvas
                  ref={canvasRef}
                  width={288}
                  height={40}
                  className="w-full h-10 rounded-lg bg-gray-100"
                />
              </div>
            )}

            {/* Transcript */}
            {transcript && (
              <div className="bg-gray-50 rounded-lg p-2 mb-3">
                <p className="text-xs text-gray-700">{transcript}</p>
              </div>
            )}

            {/* Status */}
            <div className="flex items-center gap-2 text-xs">
              {isRecording ? (
                <>
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-gray-600">Đang ghi âm...</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-600">Nhấn mic để bắt đầu</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceChatMiniPopup;

