import { request } from './api';

export const sendChatMessage = async (message, userId) => {
  try {
    const response = await request('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ 
        prompt: message,
        temperature: 0.7,
        max_tokens: 512
      })
    });
    
    // Backend trả về format: { answer: "..." } hoặc các format khác
    // Nếu response đã là string, trả về luôn
    if (typeof response === 'string') {
      return response;
    }
    
    // Nếu là object, extract text (ưu tiên answer vì đó là format của PromptResponse)
    return response.answer || response.response || response.text || response.message || response.content || JSON.stringify(response);
  } catch (error) {
    // Lỗi đã được xử lý trong request() - không cần log lại
    throw error;
  }
};

