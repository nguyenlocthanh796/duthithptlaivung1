import React, { useEffect, useState } from 'react';
import { BookOpen, Download, FileText } from 'lucide-react';
import { Document, documentsAPI } from '../services/api';

interface StudentLibraryProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const StudentLibrary: React.FC<StudentLibraryProps> = ({ showToast }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const data = await documentsAPI.getAll({ limit: 50 });
      setDocuments(data);
    } catch (error: any) {
      showToast('Không thể tải tài liệu: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (docId: string) => {
    try {
      await documentsAPI.download(docId);
      showToast('Đã ghi nhận lượt tải xuống!', 'success');
      await loadDocuments();
    } catch (error: any) {
      showToast('Lỗi: ' + error.message, 'error');
    }
  };

  if (loading) {
    return <div className="text-center py-10 text-slate-400">Đang tải tài liệu...</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in">
      <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
        <BookOpen className="text-indigo-600" /> Thư viện Tài liệu
      </h2>
      {documents.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl text-center text-slate-400">
          Chưa có tài liệu nào
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <FileText className="text-indigo-600" size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 mb-1">{doc.title}</h3>
                  <p className="text-xs text-slate-500">{doc.category}</p>
                </div>
              </div>
              {doc.description && (
                <p className="text-sm text-slate-600 mb-4 line-clamp-2">{doc.description}</p>
              )}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div className="text-xs text-slate-500">
                  <Download size={14} className="inline mr-1" />
                  {doc.downloads} lượt tải
                </div>
                <button
                  onClick={() => handleDownload(doc.id)}
                  className="text-indigo-600 hover:text-indigo-700 font-bold text-sm flex items-center gap-1"
                >
                  <Download size={16} />
                  Tải xuống
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentLibrary;


