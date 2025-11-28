import React, { useState, useEffect } from 'react';
import { Button, KatexRenderer } from '../components/ui';
import { Clock } from 'lucide-react';

const ExamRunner = ({ exam, user, onExit, appId }) => {
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(exam.duration * 60);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if(submitted) return;
    const timer = setInterval(() => setTimeLeft(t => t <= 0 ? (setSubmitted(true), 0) : t - 1), 1000);
    return () => clearInterval(timer);
  }, [submitted]);

  if(submitted) return <div className="p-10 text-center"><h1 className="text-2xl font-bold">Đã nộp bài!</h1><Button onClick={onExit} className="mt-4">Thoát</Button></div>;

  return (
    <div className="flex h-screen flex-col">
      <div className="bg-white border-b p-4 flex justify-between items-center shadow-sm z-10">
        <h1 className="font-bold">{exam.title}</h1>
        <div className="flex items-center gap-2 font-mono text-xl font-bold text-blue-600"><Clock/> {Math.floor(timeLeft/60)}:{(timeLeft%60).toString().padStart(2,'0')}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-3xl mx-auto space-y-6">
          {exam.questions.map((q, i) => (
            <div key={q.id} className="bg-white p-6 rounded-xl shadow-sm border">
              <div className="mb-4"><span className="font-bold text-gray-500">Câu {i+1}:</span> <KatexRenderer text={q.text} className="ml-2"/></div>
              <div className="grid gap-2">{q.options.map((opt, idx) => (
                <label key={idx} className={`p-3 border rounded-lg flex gap-2 cursor-pointer hover:bg-gray-50 ${answers[q.id]===idx?'border-blue-500 bg-blue-50':''}`}>
                  <input type="radio" name={q.id} checked={answers[q.id]===idx} onChange={()=>setAnswers(prev=>({...prev, [q.id]: idx}))} className="mt-1"/>
                  <KatexRenderer text={opt} className="flex-1"/>
                </label>
              ))}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4 bg-white border-t flex justify-end"><Button onClick={()=>setSubmitted(true)}>Nộp bài</Button></div>
    </div>
  );
};

export default ExamRunner;

