import React, { useState } from 'react';
import { BookOpen, Edit3, Save, X } from 'lucide-react';

interface Student {
  id: number;
  name: string;
  scores: {
    m15: number | null;
    m45: number | null;
    mid: number | null;
    end: number | null;
  };
}

interface TeacherGradebookProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
  calculateAverage: (scores: any) => string;
}

const TeacherGradebook: React.FC<TeacherGradebookProps> = ({ showToast, calculateAverage }) => {
  const [students, setStudents] = useState<Student[]>([
    { id: 1, name: 'Phạm Văn An', scores: { m15: 8, m45: 7.5, mid: 8, end: null } },
    { id: 2, name: 'Lê Thị Bình', scores: { m15: 9, m45: 9.5, mid: 9, end: null } },
    { id: 3, name: 'Trần Văn Cường', scores: { m15: 6, m45: 6.5, mid: 7, end: null } },
    { id: 4, name: 'Hoàng Thị Dung', scores: { m15: 10, m45: 9, mid: 9.5, end: null } },
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [tempScores, setTempScores] = useState<any>({});

  const startEdit = (student: Student) => {
    setEditingId(student.id);
    setTempScores({ ...student.scores });
  };

  const saveEdit = (id: number) => {
    setStudents(students.map((s) => (s.id === id ? { ...s, scores: tempScores } : s)));
    setEditingId(null);
    showToast('Đã lưu điểm thành công!', 'success');
  };

  const handleScoreChange = (key: string, value: string) => {
    setTempScores({ ...tempScores, [key]: value ? parseFloat(value) : null });
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-indigo-600" /> Sổ điểm Lớp 12A1
          </h2>
          <button className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">
            Xuất Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
              <tr>
                <th className="px-4 py-3">STT</th>
                <th className="px-4 py-3">Họ và Tên</th>
                <th className="px-4 py-3 text-center">15 Phút</th>
                <th className="px-4 py-3 text-center">1 Tiết</th>
                <th className="px-4 py-3 text-center">Giữa Kỳ</th>
                <th className="px-4 py-3 text-center">Cuối Kỳ</th>
                <th className="px-4 py-3 text-center text-indigo-600">TBM</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, idx) => {
                const isEditing = editingId === s.id;
                const scores = isEditing ? tempScores : s.scores;
                const avg = calculateAverage(scores);

                return (
                  <tr
                    key={s.id}
                    className={`border-b border-slate-50 transition ${
                      isEditing ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="px-4 py-3 text-center">{idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{s.name}</td>
                    {['m15', 'm45', 'mid', 'end'].map((key) => (
                      <td key={key} className="px-4 py-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            className="w-12 text-center border border-indigo-300 rounded p-1 text-indigo-700 font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={scores[key] || ''}
                            onChange={(e) => handleScoreChange(key, e.target.value)}
                          />
                        ) : (
                          <span
                            className={
                              scores[key] ? 'text-slate-800' : 'text-slate-300 italic'
                            }
                          >
                            {scores[key] || '-'}
                          </span>
                        )}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center font-bold text-indigo-600">
                      {avg}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => saveEdit(s.id)}
                            className="text-green-600 bg-green-100 p-1.5 rounded hover:bg-green-200"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-red-600 bg-red-100 p-1.5 rounded hover:bg-red-200"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(s)}
                          className="text-slate-400 hover:text-indigo-600 p-1.5"
                        >
                          <Edit3 size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherGradebook;


