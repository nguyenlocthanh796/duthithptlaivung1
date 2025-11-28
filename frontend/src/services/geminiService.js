import { aiService } from './api';

/**
 * Call Gemini AI - Sử dụng backend API nếu có, fallback về direct API
 */
export const callGeminiAI = async (prompt, imageBase64 = null, apiKey = null) => {
  // Lấy API key từ env nếu không được truyền vào
  const finalApiKey = apiKey || import.meta.env.VITE_GEMINI_API_KEY || null;
  
  // Ưu tiên sử dụng backend API
  try {
    const response = await aiService.complete(prompt);
    
    // Xử lý response - đảm bảo luôn trả về string
    let text = null;
    
    // Nếu response là string, dùng luôn
    if (typeof response === 'string') {
      text = response;
    }
    // Nếu response là object, extract text
    else if (response && typeof response === 'object') {
      text = response.text || response.response || response.message || response.content || response.answer;
      
      // Nếu vẫn không có, thử stringify để debug
      if (!text) {
        // Fallback: thử lấy bất kỳ string value nào
        const stringValues = Object.values(response).filter(v => typeof v === 'string' && v.length > 0);
        text = stringValues[0] || JSON.stringify(response);
      }
    }
    
    // Đảm bảo trả về string
    return text || "Không có phản hồi từ AI.";
  } catch (backendError) {
    // Log lỗi backend nhưng không throw để có thể fallback
    if (backendError.message && !backendError.message.includes('500')) {
      // Chỉ log nếu không phải lỗi 500 (đã được xử lý trong api.js)
    }
    
    // Fallback: Gọi trực tiếp Gemini API nếu có apiKey
    if (!finalApiKey) {
      // Nếu là lỗi 500, thử production backend trước
      if (backendError.message?.includes('500')) {
        return "Backend đang gặp sự cố. Vui lòng thử lại sau.";
      }
      return "Vui lòng cấu hình API Key (VITE_GEMINI_API_KEY) hoặc đảm bảo backend đang chạy.";
    }

    const model = "gemini-2.5-flash-preview-09-2025";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${finalApiKey}`;

    const parts = [{ text: prompt }];
    if (imageBase64) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64
        }
      });
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts }] })
      });
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi từ AI.";
    } catch (error) {
      return "Lỗi kết nối AI. Vui lòng kiểm tra API key hoặc kết nối mạng.";
    }
  }
};

