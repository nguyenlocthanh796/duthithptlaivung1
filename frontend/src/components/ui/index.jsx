import React, { useRef, useEffect } from 'react';

export const Button = ({ children, onClick, variant = 'primary', className = '', disabled = false, icon: Icon, size = 'md', title }) => {
  const base = "flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation";
  const sizes = { sm: "px-3 py-2 text-sm", md: "px-5 py-3 text-base", lg: "px-6 py-4 text-lg", icon: "p-3" };
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
    ai: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-200"
  };

  return (
    <button onClick={onClick} className={`${base} ${styles[variant]} ${sizes[size]} ${className}`} disabled={disabled} title={title}>
      {Icon && <Icon size={size === 'sm' ? 16 : size === 'lg' ? 24 : 20} />}
      {children}
    </button>
  );
};

export const Input = ({ label, className = '', ...props }) => (
  <div className="space-y-2 w-full">
    {label && <label className="text-sm font-semibold text-gray-600">{label}</label>}
    <input className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-base text-gray-900 placeholder:text-gray-400 ${className}`} {...props} />
  </div>
);

export const Select = ({ label, options, ...props }) => (
  <div className="space-y-2 w-full">
    {label && <label className="text-sm font-semibold text-gray-600">{label}</label>}
    <select className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-base text-gray-900 cursor-pointer" {...props}>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

export const KatexRenderer = ({ text, className = '' }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (window.katex && containerRef.current) {
        // Đảm bảo text luôn là string
        const renderText = typeof text === 'string' ? text : (text ? String(text) : "");
        
        // Pattern để match:
        // - $$...$$ (display mode - công thức riêng dòng)
        // - $...$ (inline mode - công thức trong dòng)
        // - \\(...\\) (inline mode LaTeX)
        // - \\[...\\] (display mode LaTeX)
        const parts = renderText.split(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\))/g);
        
        containerRef.current.innerHTML = '';
        
        parts.forEach(part => {
            if (!part) return;
            
            const span = document.createElement('span');
            
            // Kiểm tra các loại LaTeX
            if (part.startsWith('$$') && part.endsWith('$$')) {
                // Display mode với $$
                const mathContent = part.slice(2, -2).trim();
                const wrapper = document.createElement('div');
                wrapper.className = 'katex-display-block';
                try {
                    window.katex.render(mathContent, wrapper, { 
                        displayMode: true, 
                        throwOnError: false,
                        fleqn: false,
                        leqno: false
                    });
                    containerRef.current.appendChild(wrapper);
                } catch (e) {
                    span.innerText = part;
                    containerRef.current.appendChild(span);
                }
            } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                // Display mode với \[...\]
                const mathContent = part.slice(2, -2).trim();
                const wrapper = document.createElement('div');
                wrapper.className = 'katex-display-block';
                try {
                    window.katex.render(mathContent, wrapper, { 
                        displayMode: true, 
                        throwOnError: false
                    });
                    containerRef.current.appendChild(wrapper);
                } catch (e) {
                    span.innerText = part;
                    containerRef.current.appendChild(span);
                }
            } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                // Inline mode với $
                const mathContent = part.slice(1, -1).trim();
                try {
                    window.katex.render(mathContent, span, { 
                        displayMode: false, 
                        throwOnError: false
                    });
                    span.className = 'katex-inline';
                    containerRef.current.appendChild(span);
                } catch (e) {
                    span.innerText = part;
                    containerRef.current.appendChild(span);
                }
            } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                // Inline mode với \(...\)
                const mathContent = part.slice(2, -2).trim();
                try {
                    window.katex.render(mathContent, span, { 
                        displayMode: false, 
                        throwOnError: false
                    });
                    span.className = 'katex-inline';
                    containerRef.current.appendChild(span);
                } catch (e) {
                    span.innerText = part;
                    containerRef.current.appendChild(span);
                }
            } else {
                // Text thường
                const textSpan = document.createElement('span');
                textSpan.className = 'latex-text';
                textSpan.innerText = part;
                containerRef.current.appendChild(textSpan);
            }
        });
    } else if (containerRef.current) {
        // Đảm bảo text là string khi render
        containerRef.current.innerText = typeof text === 'string' ? text : (text ? String(text) : "");
    }
  }, [text]);

  return <div ref={containerRef} className={`latex-content ${className}`} />;
};

export { default as ImageWithFallback } from './ImageWithFallback';
