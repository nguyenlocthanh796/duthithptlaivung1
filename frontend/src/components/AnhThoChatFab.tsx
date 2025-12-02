import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { apiRequest } from '../services/api';
import RichTextMessage from './RichTextMessage';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnhThoChatFabProps {
  contextText?: string;
}

const AnhThoChatFab: React.FC<AnhThoChatFabProps> = ({ contextText }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user', content: text },
    ];

    setMessages(newMessages);
    setInput('');
    setSending(true);

    try {
      // Chuẩn hóa history cho backend
      const historyPayload = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const contextPrefix = contextText
        ? `Ngữ cảnh hiện tại: ${contextText}\n\nCâu hỏi của mình: `
        : '';

      const body = {
        message: contextPrefix + text,
        history: historyPayload,
      };

      const res = await apiRequest<{ response: string; conversation_id: string }>(
        '/api/ai-chat/chat',
        {
          method: 'POST',
          body,
          requireAuth: true,
        }
      );

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: res.response },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Anh Thơ đang hơi bận chút, cậu thử gửi lại sau nhé. (' +
            (err.message || 'Lỗi kết nối') +
            ')',
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Panel chat */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[92vw] max-w-sm shadow-2xl rounded-2xl bg-white border border-slate-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-400 to-purple-500 flex items-center justify-center text-xs font-bold">
                AT
              </div>
              <div>
                <div className="text-sm font-semibold">Anh Thơ · Trợ lý học tập</div>
                <div className="text-[11px] text-indigo-100">
                  Hỏi gì về bài tập, tớ giải thích từng bước cho nhé!
                </div>
              </div>
            </div>
            <button
              onClick={handleToggle}
              className="text-indigo-100 hover:text-white text-xs font-semibold"
            >
              Đóng
            </button>
          </div>

          <div className="flex-1 px-3 py-2 space-y-2 max-h-80 overflow-y-auto bg-slate-50/60">
            {messages.length === 0 && (
              <div className="text-xs text-slate-500 p-2">
                Gợi ý: dán đề bài hoặc mô tả đoạn cậu đang vướng. Anh Thơ sẽ giải thích
                theo kiểu bạn học, không làm hộ bài.
              </div>
            )}
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-sm'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                  }`}
                >
                  {m.role === 'assistant' ? (
                    <RichTextMessage text={m.content} />
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-2 border-t border-slate-200 bg-white flex items-center gap-2">
            <input
              className="flex-1 text-sm px-3 py-2 rounded-full border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Nhập câu hỏi của cậu..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="px-3 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50"
            >
              Gửi
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={handleToggle}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 w-14 h-14 shadow-xl flex items-center justify-center text-white hover:scale-105 transition transform"
        aria-label="Chat với Anh Thơ"
      >
        <MessageCircle className="hidden sm:block" size={24} />
        <span className="sm:hidden text-xl font-bold">AT</span>
      </button>
    </>
  );
};

export default AnhThoChatFab;


