/**
 * Chat service with "Minh" personality using Gemini API directly
 */

const SYSTEM_INSTRUCTION = `
Bạn là "Minh", một người bạn học cùng lớp với người dùng.

Tính cách:
- Cực kỳ thông minh, học giỏi tất cả các môn.
- Khiêm tốn, hòa đồng, tốt bụng.
- Luôn chia sẻ theo kiểu "Cùng nhau giải quyết".

Phong cách trả lời:
- Xưng hô thân mật: "tớ" - "cậu" hoặc "mình" - "bạn".
- Giọng điệu trẻ trung, tự nhiên (ví dụ: "Bài này khoai phết", "Cách này hay nè").
- Giải thích từng bước rõ ràng, dễ hiểu.
- CHỈ trả lời các câu hỏi về HỌC TẬP, KIẾN THỨC THPT
- KHÔNG hỗ trợ code lập trình, lập trình, programming
- Nếu câu hỏi về lập trình, từ chối lịch sự và hướng dẫn học tập thay thế
- Trả lời chính xác, đầy đủ, có công thức toán học nếu cần (dùng LaTeX)
`

export const callGeminiMultimodal = async (prompt, imageBase64, history = []) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    // Fallback to backend API if frontend API key not available
    const { chatWithAI } = await import('./api')
    const response = await chatWithAI(prompt, { 
      model: 'gemini-2.5-flash-lite',
      ...(imageBase64 && { imageUrl: imageBase64 })
    })
    return response?.answer || response?.response || response?.text || response || "Tớ đang suy nghĩ chút nhé..."
  }

  // Use gemini-2.5-flash-live for Chat AI (fallback to preview if not available)
  let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-live:generateContent?key=${apiKey}`
  
  const formattedHistory = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }))

  const parts = []
  if (imageBase64) {
    const base64Data = imageBase64.split(',')[1] || imageBase64
    parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Data } })
  }
  if (prompt) {
    parts.push({ text: prompt })
  }

  const payload = {
    contents: [...formattedHistory, { role: "user", parts: parts }],
    systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] }
  }

  try {
    // Optimize: Add AbortController for timeout handling
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // 30s timeout
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    
    const data = await response.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Tớ đang suy nghĩ chút nhé..."
  } catch (error) {
    console.error("Gemini API Error (live model):", error)
    // Fallback to gemini-2.5-flash-lite
    try {
      const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`
      const fallbackController = new AbortController()
      const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 30000)
      
      const fallbackResponse = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: fallbackController.signal,
      })
      
      clearTimeout(fallbackTimeoutId)
      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json()
        return fallbackData.candidates?.[0]?.content?.parts?.[0]?.text || "Tớ đang suy nghĩ chút nhé..."
      }
    } catch (fallbackError) {
      console.error("Fallback API Error:", fallbackError)
    }
    // Final fallback to backend API
    try {
      const { chatWithAI } = await import('./api')
      const response = await chatWithAI(prompt, { 
        model: 'gemini-2.5-flash-lite',
        ...(imageBase64 && { imageUrl: imageBase64 })
      })
      return response?.answer || response?.response || response?.text || response || "Mạng lag quá, tớ không kết nối được rồi!"
    } catch (finalError) {
      console.error("Final fallback API Error:", finalError)
      return "Mạng lag quá, tớ không kết nối được rồi!"
    }
  }
}

