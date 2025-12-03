/**
 * MathText Component
 * Hiển thị text có chứa công thức toán học
 * Tự động phát hiện và render LaTeX: $...$ (inline), $$...$$ (block)
 */
import React from 'react';
import MathDisplay from './MathDisplay';

interface MathTextProps {
  content: string;
  className?: string;
}

const MathText: React.FC<MathTextProps> = ({ content, className = '' }) => {
  // Regex để tìm inline math: $...$ (không có $$)
  const inlineMathRegex = /(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g;
  // Regex để tìm block math: $$...$$
  const blockMathRegex = /\$\$([\s\S]+?)\$\$/g;

  const renderContent = () => {
    let result: React.ReactNode[] = [];
    let lastIndex = 0;
    let processedContent = content;

    // Xử lý block math trước ($$...$$)
    const blockMatches: Array<{ match: string; start: number; end: number; formula: string }> = [];
    let blockMatch;
    while ((blockMatch = blockMathRegex.exec(processedContent)) !== null) {
      blockMatches.push({
        match: blockMatch[0],
        start: blockMatch.index,
        end: blockMatch.index + blockMatch[0].length,
        formula: blockMatch[1].trim(),
      });
    }

    // Xử lý inline math ($...$)
    const inlineMatches: Array<{ match: string; start: number; end: number; formula: string }> = [];
    let inlineMatch: RegExpExecArray | null;
    while ((inlineMatch = inlineMathRegex.exec(processedContent)) !== null) {
      // Kiểm tra xem có nằm trong block math không
      const isInBlock = blockMatches.some(
        (bm) => inlineMatch!.index >= bm.start && inlineMatch!.index < bm.end
      );
      if (!isInBlock) {
        inlineMatches.push({
          match: inlineMatch![0],
          start: inlineMatch!.index,
          end: inlineMatch!.index + inlineMatch![0].length,
          formula: inlineMatch![1].trim(),
        });
      }
    }

    // Merge và sort tất cả matches
    const allMatches = [
      ...blockMatches.map((m) => ({ ...m, type: 'block' as const })),
      ...inlineMatches.map((m) => ({ ...m, type: 'inline' as const })),
    ].sort((a, b) => a.start - b.start);

    // Render
    allMatches.forEach((match, index) => {
      // Text trước match
      if (match.start > lastIndex) {
        const textBefore = processedContent.substring(lastIndex, match.start);
        if (textBefore) {
          result.push(
            <span key={`text-${index}`} className="whitespace-pre-wrap">
              {textBefore}
            </span>
          );
        }
      }

      // Math formula
      result.push(
        <MathDisplay
          key={`math-${index}`}
          content={match.formula}
          inline={match.type === 'inline'}
          className={match.type === 'block' ? 'block my-2' : 'inline mx-1'}
        />
      );

      lastIndex = match.end;
    });

    // Text còn lại
    if (lastIndex < processedContent.length) {
      const textAfter = processedContent.substring(lastIndex);
      if (textAfter) {
        result.push(
          <span key="text-end" className="whitespace-pre-wrap">
            {textAfter}
          </span>
        );
      }
    }

    // Nếu không có math, trả về text thuần
    if (result.length === 0) {
      return <span className="whitespace-pre-wrap">{content}</span>;
    }

    return result;
  };

  return <div className={`math-text ${className}`}>{renderContent()}</div>;
};

export default MathText;

