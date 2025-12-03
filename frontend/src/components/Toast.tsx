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
      className={`fixed bottom-6 right-6 px-5 py-4 rounded-2xl shadow-large flex items-center gap-3 animate-slide-up z-[100] min-w-[320px] max-w-md ${
        type === 'success'
          ? 'bg-success-50 border-2 border-success-200 text-success-800'
          : 'bg-error-50 border-2 border-error-200 text-error-800'
      }`}
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
          type === 'success' ? 'bg-success-100' : 'bg-error-100'
        }`}
      >
        {type === 'success' ? (
          <CheckCircle size={20} className="text-success-600" />
        ) : (
          <AlertTriangle size={20} className="text-error-600" />
        )}
      </div>
      <span className="flex-1 font-medium text-sm leading-relaxed">{message}</span>
      <button
        onClick={onClose}
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-110 ${
          type === 'success' ? 'hover:bg-success-100' : 'hover:bg-error-100'
        }`}
      >
        <X size={16} className={type === 'success' ? 'text-success-600' : 'text-error-600'} />
      </button>
    </div>
  );
};

export default Toast;


