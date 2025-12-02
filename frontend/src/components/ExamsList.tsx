/**
 * Component quản lý Exams
 * Ví dụ cách sử dụng examsAPI
 */
import React, { useState, useEffect } from 'react';
import { examsAPI, Exam } from '../services/api';

const ExamsList: React.FC = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  useEffect(() => {
    loadExams();
  }, [selectedSubject]);

  const loadExams = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filters: any = { limit: 50 };
      if (selectedSubject !== 'all') {
        filters.subject = selectedSubject;
      }
      
      const data = await examsAPI.getAll(filters);
      setExams(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách đề thi');
      console.error('Error loading exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (examId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa đề thi này?')) {
      return;
    }

    try {
      await examsAPI.delete(examId);
      alert('Xóa đề thi thành công!');
      await loadExams();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
      console.error('Error deleting exam:', err);
    }
  };

  if (loading) {
    return <div>Đang tải đề thi...</div>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>Lỗi: {error}</p>
        <button onClick={loadExams}>Thử lại</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Danh sách Đề thi</h2>
      
      <div>
        <label>Môn học: </label>
        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="toan">Toán</option>
          <option value="ly">Lý</option>
          <option value="hoa">Hóa</option>
        </select>
      </div>

      <div>
        {exams.length === 0 ? (
          <p>Chưa có đề thi nào</p>
        ) : (
          exams.map((exam) => (
            <div key={exam.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h3>{exam.title}</h3>
              <p><strong>Môn:</strong> {exam.subject}</p>
              <p><strong>Thời gian:</strong> {exam.duration} phút</p>
              <p><strong>Số câu hỏi:</strong> {exam.questions_count}</p>
              <p><strong>Độ khó:</strong> {exam.difficulty}</p>
              {exam.rating && <p><strong>Đánh giá:</strong> {exam.rating}/5</p>}
              <p><small>{new Date(exam.created_at).toLocaleString('vi-VN')}</small></p>
              
              <button onClick={() => handleDelete(exam.id)}>Xóa</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ExamsList;

