import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Button, Input, Select, KatexRenderer } from '../components/ui';
import { ChevronLeft, Save, Sparkles, Plus, Trash2, BookOpen } from 'lucide-react';

const ExamCreator = ({ user, classId, apiKey, onBack, appId }) => {
  const [questions, setQuestions] = useState([]);
  const [title, setTitle] = useState('Bài kiểm tra mới');
  const [duration, setDuration] = useState(45);

  const handleSave = async () => {
    if(!questions.length) return alert("Thêm câu hỏi trước!");
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'classes', classId, 'exams'), {
        title, duration, questions, createdAt: serverTimestamp(), authorId: user.uid
      });
      alert("Đã lưu!"); onBack();
    } catch(e) { alert(e.message); }
  };

  const addQuestion = () => setQuestions([...questions, { id: Date.now(), text: '', type: 'multiple_choice', options: ['','','',''], correct: 0 }]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center p-4 border-b bg-white">
        <div className="flex gap-2"><Button variant="ghost" onClick={onBack} icon={ChevronLeft}/> <h1 className="font-bold text-lg">Soạn đề</h1></div>
        <Button onClick={handleSave} icon={Save}>Lưu</Button>
      </div>
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-6">
          <Input label="Tiêu đề" value={title} onChange={e=>setTitle(e.target.value)}/>
          <Input label="Thời gian (phút)" type="number" value={duration} onChange={e=>setDuration(e.target.value)}/>
          {questions.map((q, i) => (
            <div key={q.id} className="bg-white p-4 rounded-xl border">
              <div className="flex justify-between mb-2"><span className="font-bold">Câu {i+1}</span><Button variant="ghost" icon={Trash2} onClick={()=>setQuestions(qs=>qs.filter(x=>x.id!==q.id))}/></div>
              <textarea className="w-full p-2 border rounded mb-2" value={q.text} onChange={e=>{const newQ=[...questions];newQ[i].text=e.target.value;setQuestions(newQ)}} placeholder="Nội dung..."/>
              <div className="grid grid-cols-2 gap-2">{q.options.map((o, optI)=><input key={optI} className="border p-2 rounded" value={o} onChange={e=>{const newQ=[...questions];newQ[i].options[optI]=e.target.value;setQuestions(newQ)}} placeholder={`Lựa chọn ${optI+1}`}/>)}</div>
            </div>
          ))}
          <Button variant="secondary" className="w-full" icon={Plus} onClick={addQuestion}>Thêm câu hỏi</Button>
        </div>
      </div>
    </div>
  );
};

export default ExamCreator;

