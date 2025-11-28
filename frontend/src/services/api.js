// API Service để kết nối với backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_PRODUCTION_URL = 'https://duthi-backend-626004693464.us-central1.run.app';

// Sử dụng production URL nếu không phải localhost
const getApiUrl = () => {
  if (import.meta.env.DEV) {
    return API_BASE_URL;
  }
  return API_PRODUCTION_URL;
};

const apiUrl = getApiUrl();

/**
 * Generic API request function with fallback to production
 */
export const request = async (endpoint, options = {}, retryWithProduction = true) => {
  let url = `${apiUrl}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      // Silently try production backend for 500 errors from localhost
      if (response.status === 500 && retryWithProduction && apiUrl === API_BASE_URL && apiUrl.includes('localhost')) {
        try {
          url = `${API_PRODUCTION_URL}${endpoint}`;
          const prodResponse = await fetch(url, config);
          if (prodResponse.ok) {
            return await prodResponse.json();
          }
        } catch (prodError) {
          // Silent fail - không log
        }
      }
      // Don't throw for 500 errors - let geminiService handle fallback
      if (response.status === 500) {
        const error = await response.json().catch(() => ({ message: 'Internal Server Error' }));
        const err = new Error(error.message || 'Internal Server Error');
        // Mark as suppressed để không log
        err.suppress = true;
        throw err;
      }
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    // Nếu đang dùng localhost và lỗi, thử production backend
    if (retryWithProduction && apiUrl === API_BASE_URL && apiUrl.includes('localhost') && 
        (error.message?.includes('500') || error.message?.includes('Internal Server Error'))) {
      try {
        url = `${API_PRODUCTION_URL}${endpoint}`;
        const prodResponse = await fetch(url, config);
        if (prodResponse.ok) {
          return await prodResponse.json();
        }
      } catch (prodError) {
        // Silent fail - không log
      }
    }
    // Nếu là lỗi 500, đánh dấu để suppress
    if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
      error.suppress = true;
    }
    throw error;
  }
};

/**
 * Health check
 */
export const checkHealth = async () => {
  return request('/health');
};

/**
 * AI Services
 */
export const aiService = {
  // Generate exam questions
  generateExam: async (topic, count = 5, difficulty = 'TB') => {
    return request('/api/generate-exam', {
      method: 'POST',
      body: JSON.stringify({
        topic,
        count,
        difficulty, // 'De', 'TB', 'Kho', 'SieuKho'
      }),
    });
  },

  // AI completion - sử dụng /ai/chat endpoint
  complete: async (prompt, temperature = 0.7, maxTokens = 512) => {
    const response = await request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt,
        temperature,
        max_tokens: maxTokens,
      }),
    });
    
    // Backend có thể trả về nhiều format:
    // - { answer: "..." } (từ PromptResponse)
    // - { response: "..." }
    // - { text: "..." }
    // - { message: "..." }
    // - { content: "..." }
    // - Hoặc string trực tiếp
    
    // Nếu response đã là string, trả về luôn
    if (typeof response === 'string') {
      return { text: response, response: response };
    }
    
    // Nếu là object, extract text (ưu tiên answer vì đó là format của PromptResponse)
    const text = response.answer || response.response || response.text || response.message || response.content;
    
    return {
      text: text || JSON.stringify(response),
      response: text || JSON.stringify(response),
      ...response
    };
  },

  // AI Tutor - explain wrong answer
  tutorChat: async (message, context = '') => {
    return request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        prompt: context ? `${context}\n\n${message}` : message,
      }),
    });
  },

  // Explain wrong answer
  explainWrongAnswer: async (question, studentAnswer, correctAnswer, subject = 'Toán') => {
    return request('/ai/explain-wrong-answer', {
      method: 'POST',
      body: JSON.stringify({
        question,
        studentAnswer,
        correctAnswer,
        subject,
      }),
    });
  },
};

/**
 * Questions Service
 */
export const questionsService = {
  // Get questions
  getQuestions: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return request(`/questions?${queryParams}`);
  },

  // Create question
  createQuestion: async (questionData) => {
    return request('/questions', {
      method: 'POST',
      body: JSON.stringify(questionData),
    });
  },
};

/**
 * Files Service
 */
export const filesService = {
  // Upload file
  uploadFile: async (file, folder = '') => {
    const formData = new FormData();
    formData.append('file', file);
    if (folder) {
      formData.append('folder', folder);
    }

    const url = `${apiUrl}/files/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  },

  // Get file URL
  getFileUrl: async (fileId) => {
    return request(`/files/${fileId}`);
  },
};

/**
 * Teacher Documents Service
 */
export const teacherDocumentsService = {
  // Get documents
  getDocuments: async () => {
    return request('/teacher/documents');
  },

  // Upload document
  uploadDocument: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('file', file);
    Object.keys(metadata).forEach(key => {
      formData.append(key, metadata[key]);
    });

    const url = `${apiUrl}/teacher/documents/upload`;
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return await response.json();
  },
};

export default {
  checkHealth,
  aiService,
  questionsService,
  filesService,
  teacherDocumentsService,
};

