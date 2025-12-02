import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface School {
  id: number;
  name: string;
  principal: string;
  students: number;
  teachers: number;
  status: string;
}

interface MinistrySchoolsProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const MinistrySchools: React.FC<MinistrySchoolsProps> = ({ showToast }) => {
  const [schools, setSchools] = useState<School[]>([
    {
      id: 1,
      name: 'THPT Chuyên Lê Hồng Phong',
      principal: 'TS. Nguyễn Văn A',
      students: 1200,
      teachers: 85,
      status: 'Xuất sắc',
    },
    {
      id: 2,
      name: 'THPT Nguyễn Thượng Hiền',
      principal: 'ThS. Trần Thị B',
      students: 1500,
      teachers: 100,
      status: 'Tốt',
    },
    {
      id: 3,
      name: 'THPT Gia Định',
      principal: 'Thầy Lê Văn C',
      students: 980,
      teachers: 70,
      status: 'Khá',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchool, setNewSchool] = useState<{ name: string; principal: string; students: number }>({
    name: '',
    principal: '',
    students: 0,
  });

  const handleAddSchool = () => {
    if (!newSchool.name) return;
    setSchools([
      ...schools,
      { id: Date.now(), ...newSchool, teachers: 0, status: 'Mới' } as School,
    ]);
    setIsModalOpen(false);
    setNewSchool({ name: '', principal: '', students: 0 });
    showToast('Đã thêm trường mới thành công!', 'success');
  };

  const handleDelete = (id: number) => {
    setSchools(schools.filter((s) => s.id !== id));
    showToast('Đã xóa trường khỏi hệ thống!', 'error');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Quản lý Trường học</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus size={18} /> Thêm trường
        </button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Tên trường</th>
              <th className="px-6 py-4">Hiệu trưởng</th>
              <th className="px-6 py-4">Học sinh</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {schools.map((s) => (
              <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                <td className="px-6 py-4">{s.principal}</td>
                <td className="px-6 py-4">{s.students}</td>
                <td className="px-6 py-4">
                  <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                    {s.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition"
                  >
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {schools.length === 0 && (
          <div className="p-8 text-center text-slate-500">Không có dữ liệu</div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-bold mb-4">Thêm trường mới</h3>
            <div className="space-y-3">
              <input
                className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Tên trường"
                value={newSchool.name}
                onChange={(e) => setNewSchool({ ...newSchool, name: e.target.value })}
              />
              <input
                className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Hiệu trưởng"
                value={newSchool.principal}
                onChange={(e) => setNewSchool({ ...newSchool, principal: e.target.value })}
              />
              <input
                className="w-full border border-slate-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                type="number"
                placeholder="Số lượng học sinh"
                value={newSchool.students || ''}
                onChange={(e) =>
                  setNewSchool({
                    ...newSchool,
                    students: parseInt(e.target.value || '0', 10) || 0,
                  })
                }
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-bold"
              >
                Hủy
              </button>
              <button
                onClick={handleAddSchool}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
              >
                Lưu lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinistrySchools;


