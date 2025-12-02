import React from 'react';
import { Globe, Building, GraduationCap, Briefcase, Users } from 'lucide-react';

interface RoleSelectorProps {
  onSelect: (role: string) => void;
}

const RoleSelector: React.FC<RoleSelectorProps> = ({ onSelect }) => {
  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 bg-[url('https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"></div>
      <div className="max-w-5xl w-full relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2rem] mb-8 shadow-2xl shadow-indigo-500/30 ring-4 ring-white/10">
            <Globe size={48} className="text-white" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white mb-6 tracking-tight">
            EduSystem{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Enterprise
            </span>
          </h1>
          <p className="text-slate-300 text-xl font-light">
            Nền tảng quản trị giáo dục &amp; Học tập số 4.0
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              id: 'ministry',
              label: 'Bộ Giáo Dục',
              desc: 'Quản trị vĩ mô & Báo cáo',
              icon: Building,
              color: 'group-hover:bg-blue-600',
            },
            {
              id: 'school',
              label: 'Nhà Trường',
              desc: 'Quản lý GV & Lớp học',
              icon: GraduationCap,
              color: 'group-hover:bg-green-600',
            },
            {
              id: 'teacher',
              label: 'Giáo Viên',
              desc: 'Sổ điểm & Giảng dạy',
              icon: Briefcase,
              color: 'group-hover:bg-orange-600',
            },
            {
              id: 'student',
              label: 'Học Sinh',
              desc: 'Học tập & Thi cử',
              icon: Users,
              color: 'group-hover:bg-purple-600',
            },
          ].map((role) => (
            <button
              key={role.id}
              onClick={() => onSelect(role.id)}
              className="bg-white/5 border border-white/10 p-8 rounded-3xl text-left transition-all duration-300 hover:scale-105 hover:bg-white/10 group backdrop-blur-md"
            >
              <div
                className={`w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center mb-6 transition-colors text-white ${role.color} shadow-lg`}
              >
                <role.icon size={28} />
              </div>
              <h3 className="text-white font-bold text-xl mb-2">{role.label}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{role.desc}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoleSelector;


