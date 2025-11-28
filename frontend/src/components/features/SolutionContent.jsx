import React, { useEffect, useRef } from 'react';
import { KatexRenderer } from '../ui';

// Component hiển thị lời giải như sách giáo khoa
const SolutionContent = ({ text }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !text) return;

    const renderText = typeof text === 'string' ? text : String(text || '');
    containerRef.current.innerHTML = '';

    // Hàm render text với markdown và LaTeX
    const renderTextWithMarkdown = (textContent, parentElement) => {
      // Tách theo LaTeX trước (ưu tiên cao nhất)
      const latexPattern = /(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g;
      const parts = textContent.split(latexPattern);

      parts.forEach((part) => {
        if (!part) return;

        // LaTeX display mode ($$...$$)
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const mathContent = part.slice(2, -2).trim();
          const wrapper = document.createElement('div');
          wrapper.className = 'katex-display-block my-2 text-center';
          if (window.katex) {
            try {
              window.katex.render(mathContent, wrapper, { displayMode: true, throwOnError: false });
            } catch (e) {
              wrapper.textContent = part;
            }
          } else {
            wrapper.textContent = part;
          }
          parentElement.appendChild(wrapper);
        }
        // LaTeX inline ($...$)
        else if (part.startsWith('$') && part.endsWith('$') && part.length > 2 && !part.startsWith('$$')) {
          const mathContent = part.slice(1, -1).trim();
          const span = document.createElement('span');
          span.className = 'katex-inline';
          if (window.katex) {
            try {
              window.katex.render(mathContent, span, { displayMode: false, throwOnError: false });
            } catch (e) {
              span.textContent = part;
            }
          } else {
            span.textContent = part;
          }
          parentElement.appendChild(span);
        }
        // Markdown bold (**text**)
        else {
          const boldPattern = /\*\*([^*]+)\*\*/g;
          let lastIndex = 0;
          let match;

          while ((match = boldPattern.exec(part)) !== null) {
            if (match.index > lastIndex) {
              const beforeText = part.substring(lastIndex, match.index);
              if (beforeText) {
                parentElement.appendChild(document.createTextNode(beforeText));
              }
            }

            const bold = document.createElement('strong');
            bold.className = 'font-semibold text-gray-900';
            bold.textContent = match[1];
            parentElement.appendChild(bold);

            lastIndex = match.index + match[0].length;
          }

          if (lastIndex < part.length) {
            const remainingText = part.substring(lastIndex);
            if (remainingText) {
              parentElement.appendChild(document.createTextNode(remainingText));
            }
          }

          if (lastIndex === 0) {
            parentElement.appendChild(document.createTextNode(part));
          }
        }
      });
    };

    // Xử lý từng dòng
    const lines = renderText.split('\n');
    lines.forEach((line, lineIdx) => {
      if (lineIdx > 0) {
        containerRef.current.appendChild(document.createElement('br'));
      }

      if (!line.trim() && lineIdx < lines.length - 1) {
        return;
      }

      // Heading (## ...)
      if (line.trim().startsWith('##')) {
        const heading = document.createElement('h2');
        heading.className = 'text-xl font-bold mt-4 mb-2 text-gray-900 border-b border-purple-200 pb-1.5';
        const headingText = line.replace(/^##\s+/, '');
        renderTextWithMarkdown(headingText, heading);
        containerRef.current.appendChild(heading);
      }
      // Subheading (### ...)
      else if (line.trim().startsWith('###')) {
        const subheading = document.createElement('h3');
        subheading.className = 'text-lg font-semibold mt-3 mb-2 text-gray-800';
        const subheadingText = line.replace(/^###\s+/, '');
        renderTextWithMarkdown(subheadingText, subheading);
        containerRef.current.appendChild(subheading);
      }
      // Numbered list (1. ...)
      else if (/^\d+\.\s+/.test(line.trim())) {
        const listItem = document.createElement('div');
        listItem.className = 'ml-5 my-1 relative';
        const listText = line.replace(/^\d+\.\s+/, '');
        
        // Tạo số thứ tự
        const number = document.createElement('span');
        number.className = 'absolute -left-5 font-semibold text-purple-600 text-sm';
        number.textContent = line.match(/^\d+/)[0] + '.';
        listItem.appendChild(number);
        
        const content = document.createElement('span');
        renderTextWithMarkdown(listText, content);
        listItem.appendChild(content);
        
        containerRef.current.appendChild(listItem);
      }
      // Bullet list (- ...)
      else if (/^-\s+/.test(line.trim())) {
        const listItem = document.createElement('div');
        listItem.className = 'ml-5 my-1 relative';
        const listText = line.replace(/^-\s+/, '');
        
        // Tạo bullet
        const bullet = document.createElement('span');
        bullet.className = 'absolute -left-4 text-purple-600 font-bold';
        bullet.textContent = '•';
        listItem.appendChild(bullet);
        
        const content = document.createElement('span');
        renderTextWithMarkdown(listText, content);
        listItem.appendChild(content);
        
        containerRef.current.appendChild(listItem);
      }
      // Chemical formula pattern (H2O, CO2, etc.) - Highlight
      else if ((/[A-Z][a-z]?\d*[A-Z]?[a-z]?\d*/.test(line.trim()) && (line.includes('→') || line.includes('=') || line.includes('+'))) || 
               (line.includes('H') && line.includes('O') && /\d/.test(line))) {
        const paragraph = document.createElement('div');
        paragraph.className = 'my-2 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500';
        
        // Highlight chemical formulas với subscript
        let processedLine = line;
        // Pattern cho công thức hóa học: H2O, CO2, CaCO3, etc.
        const chemPattern = /([A-Z][a-z]?\d*[A-Z]?[a-z]?\d*(?:[+\-]?[A-Z][a-z]?\d*[A-Z]?[a-z]?\d*)*)/g;
        processedLine = processedLine.replace(chemPattern, (match) => {
          // Convert số thành subscript
          const withSubscript = match.replace(/(\d+)/g, '<sub class="text-sm">$1</sub>');
          return `<span class="font-mono font-semibold text-blue-800 text-lg">${withSubscript}</span>`;
        });
        
        // Highlight arrows
        processedLine = processedLine.replace(/→/g, '<span class="text-blue-600 font-bold text-xl mx-2">→</span>');
        processedLine = processedLine.replace(/⇌/g, '<span class="text-blue-600 font-bold text-xl mx-2">⇌</span>');
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedLine;
        // Render markdown cho phần còn lại
        const textContent = tempDiv.textContent;
        const beforeChem = textContent.split(/[A-Z][a-z]?\d*/)[0];
        if (beforeChem) {
          const beforeElem = document.createElement('span');
          renderTextWithMarkdown(beforeChem, beforeElem);
          paragraph.appendChild(beforeElem);
        }
        paragraph.innerHTML += processedLine;
        containerRef.current.appendChild(paragraph);
      }
      // Physics formula pattern (F = ma, E = mc², etc.)
      else if (/[A-Z]\s*=\s*[^=]+/.test(line.trim()) && (line.includes('=') || line.includes('→'))) {
        const paragraph = document.createElement('div');
        paragraph.className = 'my-2 p-3 bg-indigo-50 rounded-lg border-l-4 border-indigo-500';
        
        // Highlight physics formulas
        let processedLine = line;
        // Pattern cho công thức vật lý: F = ma, E = mc², v = s/t, etc.
        const physicsPattern = /([A-Z][a-z]?)\s*=\s*([^=]+)/g;
        processedLine = processedLine.replace(physicsPattern, (match, var1, formula) => {
          return `<span class="font-semibold text-indigo-800">${var1}</span> = <span class="font-mono text-indigo-700">${formula.trim()}</span>`;
        });
        
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedLine;
        // Render markdown cho phần còn lại
        renderTextWithMarkdown(tempDiv.textContent, paragraph);
        // Giữ lại HTML đã highlight
        const highlightedParts = processedLine.match(/<span[^>]*>.*?<\/span>/g);
        if (highlightedParts) {
          paragraph.innerHTML = processedLine;
        }
        containerRef.current.appendChild(paragraph);
      }
      // Regular paragraph - Tối ưu cho văn bản ngữ văn
      else if (line.trim()) {
        const paragraph = document.createElement('p');
        // Kiểm tra nếu là văn bản dài (có thể là ngữ văn)
        const isLongText = line.trim().length > 100;
        paragraph.className = `leading-relaxed my-2 text-gray-800 text-sm md:text-base ${
          isLongText ? 'text-justify indent-6' : ''
        }`;
        renderTextWithMarkdown(line, paragraph);
        containerRef.current.appendChild(paragraph);
      }
    });
  }, [text]);

  return (
    <div 
      ref={containerRef} 
      className="text-gray-800 leading-relaxed"
      style={{
        fontFamily: '"Times New Roman", "Times", "Georgia", serif',
        lineHeight: '1.7',
        fontSize: '15px',
        letterSpacing: '0.01em'
      }}
    />
  );
};

export default SolutionContent;

