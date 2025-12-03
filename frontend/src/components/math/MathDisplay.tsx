/**
 * MathDisplay Component
 * Hiển thị công thức toán học với KaTeX
 * Hỗ trợ: inline math ($...$), block math ($$...$$), và LaTeX thuần
 */
import React from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathDisplayProps {
  content: string;
  inline?: boolean;
  className?: string;
}

const MathDisplay: React.FC<MathDisplayProps> = ({ 
  content, 
  inline = false,
  className = '' 
}) => {
  try {
    const html = katex.renderToString(content, {
      throwOnError: false,
      displayMode: !inline,
      output: 'html',
      strict: false,
    });
    
    return (
      <span
        className={`math-display ${inline ? 'inline' : 'block'} ${className}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch (error) {
    // Fallback: hiển thị raw LaTeX nếu có lỗi
    return (
      <span className={`text-error-600 text-sm ${className}`}>
        {inline ? `$${content}$` : `$$${content}$$`}
      </span>
    );
  }
};

export default MathDisplay;

