import { aiService } from './api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_PRODUCTION_URL = 'https://duthi-backend-626004693464.us-central1.run.app';

const getApiUrl = () => {
  if (import.meta.env.DEV) {
    return API_BASE_URL;
  }
  return API_PRODUCTION_URL;
};

const apiUrl = getApiUrl();

/**
 * Voice Chat Service - Sử dụng Gemini 2.5 Flash Live
 */
export const voiceService = {
  /**
   * Gửi audio data đến backend để xử lý với Gemini Live
   * Fallback về text transcript nếu voice API chưa có
   */
  sendAudio: async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');
      formData.append('model', 'gemini-2.5-flash-live');

      const response = await fetch(`${apiUrl}/ai/voice-chat`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        // Nếu endpoint chưa có, fallback về null để dùng transcript
        if (response.status === 404) {
          return null;
        }
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(error.message || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      // Nếu lỗi network hoặc endpoint không tồn tại, fallback
      if (error.message.includes('404') || error.message.includes('Failed to fetch')) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Gửi text transcript đến backend (fallback nếu voice API không có)
   */
  sendTranscript: async (text) => {
    try {
      const response = await aiService.complete(text);
      return {
        text: response.text || response.response || "Không có phản hồi từ AI.",
        audio: null // Backend có thể trả về audio URL nếu có
      };
    } catch (error) {
      throw error;
    }
  },
};

/**
 * Web Speech API wrapper
 */
export class SpeechRecognitionService {
  constructor() {
    this.recognition = null;
    this.isListening = false;
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;

    // Kiểm tra browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'vi-VN'; // Tiếng Việt

      this.recognition.onresult = (event) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (this.onResult) {
          this.onResult({
            interim: interimTranscript,
            final: finalTranscript.trim()
          });
        }
      };

      this.recognition.onerror = (event) => {
        if (this.onError) {
          this.onError(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        if (this.onEnd) {
          this.onEnd();
        }
      };
    }
  }

  start() {
    if (!this.recognition) {
      throw new Error('Speech Recognition not supported');
    }

    if (!this.isListening) {
      this.recognition.start();
      this.isListening = true;
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  isSupported() {
    return !!this.recognition;
  }
}

/**
 * Audio Visualization - Tạo sóng âm từ audio stream
 */
export class AudioVisualizer {
  constructor(canvasRef, audioContext = null) {
    this.canvas = canvasRef?.current;
    this.audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
    this.analyser = null;
    this.dataArray = null;
    this.animationFrame = null;
    this.isVisualizing = false;
  }

  setup(stream) {
    if (!this.canvas) return;

    const source = this.audioContext.createMediaStreamSource(stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    source.connect(this.analyser);

    const bufferLength = this.analyser.frequencyBinCount;
    this.dataArray = new Uint8Array(bufferLength);

    const canvasCtx = this.canvas.getContext('2d');
    const width = this.canvas.width;
    const height = this.canvas.height;

    const draw = () => {
      if (!this.isVisualizing) return;

      this.animationFrame = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(this.dataArray);

      canvasCtx.fillStyle = 'rgba(0, 0, 0, 0)';
      canvasCtx.fillRect(0, 0, width, height);

      const barWidth = (width / this.dataArray.length) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < this.dataArray.length; i++) {
        barHeight = (this.dataArray[i] / 255) * height;

        const gradient = canvasCtx.createLinearGradient(0, height - barHeight, 0, height);
        gradient.addColorStop(0, '#8b5cf6'); // purple
        gradient.addColorStop(0.5, '#6366f1'); // indigo
        gradient.addColorStop(1, '#3b82f6'); // blue

        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
      }
    };

    draw();
  }

  start() {
    this.isVisualizing = true;
  }

  stop() {
    this.isVisualizing = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    if (this.canvas) {
      const canvasCtx = this.canvas.getContext('2d');
      canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

