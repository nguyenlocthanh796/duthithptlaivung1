import React from 'react';
import { CheckCircle, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  return (
    <div
      className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right z-[100] ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
      <span className="font-bold">{message}</span>
      <button onClick={onClose}>
        <X size={16} className="opacity-50 hover:opacity-100" />
      </button>
    </div>
  );
};

export default Toast;


