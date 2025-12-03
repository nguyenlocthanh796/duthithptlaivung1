import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface RichTextMessageProps {
  text: string;
}

/**
 * Hiển thị message hỗ trợ:
 * - Markdown cơ bản: **đậm**, *nghiêng*, gạch đầu dòng -, đánh số.
 * - Công thức Toán/Lý/Hóa với LaTeX: $...$ (inline), $$...$$ (block).
 */
const RichTextMessage: React.FC<RichTextMessageProps> = ({ text }) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-strong:font-semibold"
      components={{
        p: ({ children }) => <span>{children}</span>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
};

export default RichTextMessage;


