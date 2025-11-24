import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

export const chatWithAI = async (prompt, options = {}) => {
  const { temperature = 0.4, max_tokens = 512 } = options
  const { data } = await apiClient.post('/ai/chat', {
    prompt,
    temperature,
    max_tokens,
  })
  return data
}

export const testAI = async () => {
  const { data } = await apiClient.get('/ai/test')
  return data
}

export const uploadMedia = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export const cloneQuestion = async ({ question, correct_answer }) => {
  try {
  const { data } = await apiClient.post('/questions/clone', {
    question,
    correct_answer,
  })
  return data
  } catch (error) {
    // Log detailed error for debugging
    if (error.response) {
      // Server responded with error
      console.error('Server error:', error.response.status, error.response.data)
      throw error
    } else if (error.request) {
      // Request made but no response
      console.error('No response from server:', error.request)
      throw new Error('Không thể kết nối đến server. Vui lòng kiểm tra backend có đang chạy không.')
    } else {
      // Error setting up request
      console.error('Request setup error:', error.message)
      throw error
    }
  }
}

export const solveComment = async (commentText) => {
  const { data } = await apiClient.post('/ai/solve-comment', {
    commentText,
  })
  return data
}

export const solvePost = async (postText) => {
  const { data } = await apiClient.post('/ai/solve-post', {
    postText,
  })
  return data
}

export const extractQuestionsFromFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/files/extract-questions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
