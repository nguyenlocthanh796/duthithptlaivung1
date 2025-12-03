/**
 * MathEditor Component
 * Editor công thức toán học với MathLive
 * Cho phép nhập và chỉnh sửa công thức toán học một cách trực quan
 */
import React, { useEffect, useRef, useState } from 'react';
import { MathfieldElement } from 'mathlive';
import 'mathlive/fonts.css';

// Đăng ký custom element
if (typeof window !== 'undefined' && !customElements.get('math-field')) {
  customElements.define('math-field', MathfieldElement);
}

interface MathEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  inline?: boolean;
  className?: string;
  disabled?: boolean;
}

const MathEditor: React.FC<MathEditorProps> = ({
  value = '',
  onChange,
  placeholder = 'Nhập công thức toán học...',
  inline = false,
  className = '',
  disabled = false,
}) => {
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    if (!containerRef.current || typeof window === 'undefined') return;

    // Load MathLive async
    import('mathlive').then((mathlive) => {
      if (!containerRef.current) return;
      
      const MathfieldElement = mathlive.MathfieldElement;
      
      // Đăng ký custom element nếu chưa có
      if (!customElements.get('math-field')) {
        customElements.define('math-field', MathfieldElement);
      }

      // Tạo math-field element
      const mathField = document.createElement('math-field') as any;
      mathField.setValue(value || '');
      mathField.placeholder = placeholder;
      mathField.disabled = disabled;
      
      // Cấu hình MathLive
      mathField.setOptions({
        virtualKeyboardMode: 'manual',
        smartFence: true,
        smartSuperscript: true,
        removeExtraneousParentheses: true,
      });

      // Event handlers
      mathField.addEventListener('input', (e: any) => {
        const newValue = e.target.getValue();
        onChange?.(newValue);
      });

      mathField.addEventListener('focus', () => setIsFocused(true));
      mathField.addEventListener('blur', () => setIsFocused(false));

      containerRef.current.appendChild(mathField);
      mathFieldRef.current = mathField;
    });

    return () => {
      if (mathFieldRef.current && containerRef.current) {
        try {
          containerRef.current.removeChild(mathFieldRef.current);
        } catch (e) {
          // Ignore if already removed
        }
      }
    };
  }, []);

  // Update value khi prop thay đổi
  useEffect(() => {
    if (mathFieldRef.current && mathFieldRef.current.getValue() !== value) {
      mathFieldRef.current.setValue(value || '');
    }
  }, [value]);

  // Update disabled state
  useEffect(() => {
    if (mathFieldRef.current) {
      mathFieldRef.current.disabled = disabled;
    }
  }, [disabled]);

  return (
    <div
      ref={containerRef}
      className={`math-editor ${isFocused ? 'focused' : ''} ${className}`}
      style={{
        border: isFocused ? '2px solid var(--primary-600)' : '1px solid var(--neutral-300)',
        borderRadius: '0.75rem',
        padding: '0.5rem',
        backgroundColor: disabled ? 'var(--neutral-100)' : 'white',
        minHeight: inline ? '2.5rem' : '4rem',
      }}
    />
  );
};

export default MathEditor;

