import React, { useState, useEffect } from 'react';
import { collection, query, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button, Input } from '../components/ui';
import { Users, Clock, Plus } from 'lucide-react';
import { timeAgo } from '../utils/helpers';

const ClassCard = ({ classData, onClick }) => (
  <div onClick={onClick} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer group flex flex-col h-full">
    <div className="h-24 bg-gradient-to-r from-blue-500 to-indigo-600 relative p-4">
      <h3 className="text-white font-bold text-xl line-clamp-1">{classData.name}</h3>
      <p className="text-blue-100 text-sm">{classData.teacherName || 'Giáo viên'}</p>
      <div className="absolute -bottom-6 right-4 w-12 h-12 bg-white rounded-full p-1 shadow-md">
        <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-lg font-bold text-blue-600">
          {classData.name.charAt(0)}
        </div>
      </div>
    </div>
    <div className="p-4 pt-8 flex-1 flex flex-col justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-gray-500 text-sm"><Users size={16}/> {classData.studentCount || 0} học viên</div>
        <div className="flex items-center gap-2 text-gray-500 text-sm"><Clock size={16}/> Cập nhật {timeAgo(classData.updatedAt || classData.createdAt)}</div>
      </div>
      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <span className="text-blue-600 text-sm font-medium group-hover:underline">Truy cập lớp học &rarr;</span>
      </div>
    </div>
  </div>
);

const MyClasses = ({ user, appId }) => {
  const [classes, setClasses] = useState([]);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'classes'), where('studentIds', 'array-contains', user.uid), limit(20));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      if (data.length === 0) {
        setClasses([
          { id: '1', name: 'Toán 12 - Luyện Thi', teacherName: 'Thầy Lâm', studentCount: 45, createdAt: new Date() },
          { id: '2', name: 'Vật Lý Hạt Nhân', teacherName: 'Cô Lan', studentCount: 32, createdAt: new Date() },
        ]);
      } else setClasses(data);
    });
    return () => unsubscribe();
  }, [user, appId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div><h1 className="text-2xl font-bold text-gray-900">Lớp học của tôi</h1></div>
        <Button icon={Plus} onClick={() => setIsJoinModalOpen(true)}>Tham gia lớp</Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map(cls => <ClassCard key={cls.id} classData={cls} onClick={()=>{}} />)}
        <div onClick={() => setIsJoinModalOpen(true)} className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 min-h-[200px]"><div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3"><Plus size={24}/></div><span className="font-medium text-gray-600">Tham gia lớp mới</span></div>
      </div>
      {isJoinModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6"><h3 className="text-xl font-bold mb-4">Tham gia lớp</h3><Input placeholder="Mã lớp" value={joinCode} onChange={e=>setJoinCode(e.target.value)}/><div className="flex gap-3 mt-4"><Button variant="ghost" onClick={()=>setIsJoinModalOpen(false)}>Hủy</Button><Button>Tham gia</Button></div></div>
        </div>
      )}
    </div>
  );
};

export default MyClasses;

