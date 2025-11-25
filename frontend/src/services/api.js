import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

export const chatWithAI = async (prompt, options = {}) => {
  const { temperature = 0.4, max_tokens = 512, model, imageUrl } = options
  const payload = {
    prompt,
    temperature,
    max_tokens,
    model, // Support model selection
  }
  if (imageUrl) {
    payload.imageUrl = imageUrl
  }
  const { data } = await apiClient.post('/ai/chat', payload)
  return data
}

export const generateIllustration = async (content) => {
  try {
    const { data } = await apiClient.post('/ai/generate-illustration', {
      content,
    })
    return data
  } catch (error) {
    if (error.response) {
      const errorMessage = error.response.data?.detail || error.response.data?.message || error.message
      const errorWithDetail = new Error(errorMessage)
      errorWithDetail.response = error.response
      errorWithDetail.status = error.response.status
      throw errorWithDetail
    }
    throw error
  }
}

export const processTeacherDocument = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  try {
    const { data } = await apiClient.post('/teacher/process-document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  } catch (error) {
    if (error.response) {
      const errorMessage = error.response.data?.detail || error.response.data?.message || error.message
      const errorWithDetail = new Error(errorMessage)
      errorWithDetail.response = error.response
      errorWithDetail.status = error.response.status
      throw errorWithDetail
    }
    throw error
  }
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
  try {
    const { data } = await apiClient.post('/ai/solve-comment', {
      commentText,
    })
    return data
  } catch (error) {
    // Re-throw với thông tin đầy đủ để frontend có thể hiển thị
    if (error.response) {
      const errorMessage = error.response.data?.detail || error.response.data?.message || error.message
      const errorWithDetail = new Error(errorMessage)
      errorWithDetail.response = error.response
      errorWithDetail.status = error.response.status
      throw errorWithDetail
    }
    throw error
  }
}

export const solvePost = async (postText) => {
  try {
    const { data } = await apiClient.post('/ai/solve-post', {
      postText,
    })
    return data
  } catch (error) {
    // Re-throw với thông tin đầy đủ để frontend có thể hiển thị
    if (error.response) {
      // Server trả về response với status code
      const errorMessage = error.response.data?.detail || error.response.data?.message || error.message
      const errorWithDetail = new Error(errorMessage)
      errorWithDetail.response = error.response
      errorWithDetail.status = error.response.status
      throw errorWithDetail
    }
    throw error
  }
}

export const extractQuestionsFromFile = async (file) => {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post('/files/extract-questions', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
