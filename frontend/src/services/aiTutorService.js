/**
 * AI Tutor Service
 * Giai đoạn 1: "Gia sư AI" - Giải thích tại sao học sinh sai
 */

import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

/**
 * Get AI explanation for wrong answer
 * Option 1: Via Cloud Function (recommended for production)
 * Option 2: Direct API call to Python backend
 */
export async function getAIExplanation(question, studentAnswer, correctAnswer, subject = 'Toán') {
  try {
    // Try Cloud Function first (if available)
    if (functions) {
      try {
        const explainWrongAnswer = httpsCallable(functions, 'getAIExplanation')
        const result = await explainWrongAnswer({
          question: typeof question === 'string' ? question : question.text,
          studentAnswer,
          correctAnswer,
          questionText: typeof question === 'string' ? question : question.text,
        })
        return result.data
      } catch (error) {
        console.warn('Cloud Function not available, using direct API:', error)
      }
    }

    // Fallback: Direct API call to Python backend
    const response = await axios.post(`${API_BASE_URL}/ai/explain-wrong-answer`, {
      question: typeof question === 'string' ? question : question.text,
      studentAnswer,
      correctAnswer,
      subject,
    })

    return {
      explanation: response.data.explanation,
      hints: response.data.hints || [],
      subject: response.data.subject || subject,
    }
  } catch (error) {
    console.error('Error getting AI explanation:', error)
    throw new Error(
      error.response?.data?.detail || 
      'Không thể lấy lời giải thích từ AI. Vui lòng thử lại sau.'
    )
  }
}

/**
 * Analyze student weaknesses
 * Giai đoạn 3: Cá nhân hóa
 */
export async function analyzeWeakness(weaknesses, strengths) {
  try {
    const response = await axios.post(`${API_BASE_URL}/ai/analyze-weakness`, {
      weaknesses,
      strengths,
    })

    return {
      analysis: response.data.analysis,
      recommendations: response.data.recommendations || [],
    }
  } catch (error) {
    console.error('Error analyzing weakness:', error)
    throw new Error('Không thể phân tích điểm yếu. Vui lòng thử lại sau.')
  }
}

