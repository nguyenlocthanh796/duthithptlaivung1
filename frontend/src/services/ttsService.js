/**
 * Text-to-Speech service using Gemini TTS API
 */
export const callGeminiTTS = async (text) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.warn('VITE_GEMINI_API_KEY not set, TTS will not work')
    return null
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`
  const styledText = `Say in a friendly, enthusiastic, young student's voice: ${text}`
  const payload = {
    contents: [{ parts: [{ text: styledText }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: { 
        voiceConfig: { 
          prebuiltVoiceConfig: { voiceName: "Aoede" } 
        } 
      }
    }
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) {
      throw new Error(`TTS API Error: ${response.status}`)
    }
    
    const data = await response.json()
    const base64Audio = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    
    if (!base64Audio) {
      return null
    }
    
    // Convert Base64 PCM to Blob URL
    const binaryString = window.atob(base64Audio)
    const len = binaryString.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    
    // Create WAV header
    const wavHeader = new ArrayBuffer(44)
    const view = new DataView(wavHeader)
    const writeString = (view, offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }
    
    writeString(view, 0, 'RIFF')
    view.setUint32(4, 36 + len, true)
    writeString(view, 8, 'WAVE')
    writeString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, 1, true)
    view.setUint32(24, 24000, true)
    view.setUint32(28, 48000, true)
    view.setUint16(32, 2, true)
    view.setUint16(34, 16, true)
    writeString(view, 36, 'data')
    view.setUint32(40, len, true)
    
    return URL.createObjectURL(new Blob([view, bytes], { type: 'audio/wav' }))
  } catch (error) {
    console.error('TTS Error:', error)
    return null
  }
}

