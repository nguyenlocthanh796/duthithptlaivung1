/**
 * LaTeX Renderer Utility
 * Centralized LaTeX and Markdown rendering to avoid code duplication
 */
import { InlineMath, BlockMath } from 'react-katex'

/**
 * Render text with LaTeX math, markdown bold, headings, and lists support
 * @param {string} text - Text to render
 * @returns {JSX.Element[]} Array of React elements
 */
export function renderTextWithLatex(text) {
  if (!text || typeof text !== 'string') return <span></span>
  
  // Split by lines to handle structure
  const lines = text.split('\n')
  const elements = []
  let currentList = []
  let currentNumberedList = []
  let currentParagraph = []
  
  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 my-3 text-slate-800 dark:text-slate-200">
          {currentList.map((item, i) => (
            <li key={i} className="text-base leading-relaxed">
              {renderInlineContent(item)}
            </li>
          ))}
        </ul>
      )
      currentList = []
    }
  }
  
  const flushNumberedList = () => {
    if (currentNumberedList.length > 0) {
      elements.push(
        <ol key={`numbered-list-${elements.length}`} className="list-decimal list-inside space-y-2 my-3 text-slate-800 dark:text-slate-200">
          {currentNumberedList.map((item, i) => (
            <li key={i} className="text-base leading-relaxed">
              {renderInlineContent(item)}
            </li>
          ))}
        </ol>
      )
      currentNumberedList = []
    }
  }
  
  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const paraText = currentParagraph.join(' ').trim()
      if (paraText) {
        elements.push(
          <p key={`para-${elements.length}`} className="text-base leading-relaxed text-slate-800 dark:text-slate-200 my-3 first:mt-0">
            {renderInlineContent(paraText)}
          </p>
        )
      }
      currentParagraph = []
    }
  }
  
  lines.forEach((line, index) => {
    const trimmed = line.trim()
    
    // Empty line - flush current blocks
    if (!trimmed) {
      flushList()
      flushNumberedList()
      flushParagraph()
      return
    }
    
    // Heading (## Heading)
    if (trimmed.startsWith('## ')) {
      flushList()
      flushNumberedList()
      flushParagraph()
      const headingText = trimmed.substring(3).trim()
      elements.push(
        <h3 key={`heading-${elements.length}`} className="text-lg font-semibold text-slate-900 dark:text-slate-100 mt-5 mb-3 first:mt-0">
          {renderInlineContent(headingText)}
        </h3>
      )
      return
    }
    
    // Numbered list item (1., 2., 3., etc.)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/)
    if (numberedMatch) {
      flushParagraph()
      flushList()
      const itemText = numberedMatch[2].trim()
      currentNumberedList.push(itemText)
      return
    }
    
    // List item (- item)
    if (trimmed.startsWith('- ')) {
      flushParagraph()
      flushNumberedList()
      const itemText = trimmed.substring(2).trim()
      currentList.push(itemText)
      return
    }
    
    // Regular text - add to paragraph
    flushList()
    flushNumberedList()
    currentParagraph.push(trimmed)
  })
  
  // Flush remaining
  flushList()
  flushNumberedList()
  flushParagraph()
  
  return elements.length > 0 ? <div className="space-y-2">{elements}</div> : <span>{text}</span>
}

/**
 * Render inline content (bold, LaTeX) within a paragraph
 */
function renderInlineContent(text) {
  if (!text || typeof text !== 'string') return <span></span>
  
  const parts = []
  let lastIndex = 0
  
  // Patterns to match (in priority order)
  const blockRegex = /\$\$([^$]+)\$\$/g
  const inlineRegex = /\$([^$]+)\$/g
  const boldRegex = /\*\*([^*]+)\*\*/g
  
  const allMatches = []
  let match
  const usedRanges = [] // Track used ranges to avoid double matching

  // First, find all block math ($$...$$) - highest priority
  try {
    while ((match = blockRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim()) {
        allMatches.push({ 
          type: 'block', 
          start: match.index, 
          end: match.index + match[0].length, 
          content: match[1].trim(),
          fullMatch: match[0]
        })
        usedRanges.push({ start: match.index, end: match.index + match[0].length })
      }
    }
  } catch (e) {
    console.warn('Error parsing block math:', e)
  }

  // Then find inline math ($...$), but skip if inside block math
  try {
    while ((match = inlineRegex.exec(text)) !== null) {
      const matchStart = match.index
      const matchEnd = match.index + match[0].length
      
      const isInsideBlock = usedRanges.some(range => 
        matchStart >= range.start && matchEnd <= range.end
      )
      
      if (!isInsideBlock && match[1] && match[1].trim()) {
        allMatches.push({ 
          type: 'inline', 
          start: matchStart, 
          end: matchEnd, 
          content: match[1].trim(),
          fullMatch: match[0]
        })
        usedRanges.push({ start: matchStart, end: matchEnd })
      }
    }
  } catch (e) {
    console.warn('Error parsing inline math:', e)
  }

  // Then find bold markdown (**text**), but skip if inside math
  try {
    while ((match = boldRegex.exec(text)) !== null) {
      const matchStart = match.index
      const matchEnd = match.index + match[0].length
      
      const isInsideMath = usedRanges.some(range => 
        matchStart >= range.start && matchEnd <= range.end
      )
      
      if (!isInsideMath && match[1] && match[1].trim()) {
        allMatches.push({ 
          type: 'bold', 
          start: matchStart, 
          end: matchEnd, 
          content: match[1].trim(),
          fullMatch: match[0]
        })
        usedRanges.push({ start: matchStart, end: matchEnd })
      }
    }
  } catch (e) {
    console.warn('Error parsing bold markdown:', e)
  }

  // Sort all matches by start position
  allMatches.sort((a, b) => a.start - b.start)

  // Remove overlapping matches (keep the first one)
  const filteredMatches = []
  for (let i = 0; i < allMatches.length; i++) {
    const current = allMatches[i]
    const overlaps = filteredMatches.some(existing => 
      (current.start >= existing.start && current.start < existing.end) ||
      (current.end > existing.start && current.end <= existing.end) ||
      (current.start <= existing.start && current.end >= existing.end)
    )
    if (!overlaps) {
      filteredMatches.push(current)
    }
  }

  // Render the filtered matches
  filteredMatches.forEach((match) => {
    if (match.start > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.start)}</span>)
    }
    try {
      if (match.type === 'block') {
        parts.push(
          <div key={`math-block-${match.start}`} className="my-3 overflow-x-auto" style={{ minHeight: '2em' }}>
            <BlockMath>{match.content}</BlockMath>
          </div>
        )
      } else if (match.type === 'inline') {
        parts.push(<InlineMath key={`math-inline-${match.start}`}>{match.content}</InlineMath>)
      } else if (match.type === 'bold') {
        parts.push(<strong key={`bold-${match.start}`} className="font-bold text-slate-900 dark:text-slate-100">{match.content}</strong>)
      }
    } catch (e) {
      console.warn('Rendering error (LaTeX or Markdown):', e)
      parts.push(<span key={`error-${match.start}`} className="text-red-500">{match.fullMatch}</span>)
    }
    lastIndex = match.end
  })

  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>)
  }

  return parts.length > 0 ? <>{parts}</> : <span>{text}</span>
}
