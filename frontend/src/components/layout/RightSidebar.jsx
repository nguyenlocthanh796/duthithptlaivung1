import React from 'react';
import { Lightbulb, Sparkles, Calendar, TrendingUp } from 'lucide-react';

const RightSidebar = ({ isOpen }) => {
  return (
    <aside className={`
      fixed top-16 right-0 bottom-0 w-80 bg-white border-l border-gray-200 z-20 transition-transform duration-300 overflow-y-auto
      ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      hidden xl:block
    `}>
      <div className="p-6 space-y-4">
        {/* Widget 1: Tips */}
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="text-amber-500" size={20} />
            <h3 className="font-bold text-gray-800 text-sm">Mẹo học tập</h3>
          </div>
          <p className="text-xs text-gray-600 leading-relaxed">
            Sử dụng phương pháp Pomodoro: 25 phút học, 5 phút nghỉ để tăng hiệu quả.
          </p>
        </div>

        {/* Widget 2: AI Teaser */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="text-purple-600" size={20} />
            <h3 className="font-bold text-gray-800 text-sm">Trợ lý AI</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Khó khăn với bài tập? Hỏi ngay AI.
          </p>
          <button className="w-full py-1.5 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg hover:bg-purple-100">Hỏi ngay</button>
        </div>

        {/* Widget 3: Calendar */}
        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="text-blue-600" size={20} />
            <h3 className="font-bold text-gray-800 text-sm">Lịch sắp tới</h3>
          </div>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="bg-gray-100 px-2 py-1 rounded text-xs font-bold text-gray-600 w-10 text-center">
                <span>30/11</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Thi thử Toán 12</p>
                <p className="text-[10px] text-gray-500">08:00 - Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default RightSidebar;

