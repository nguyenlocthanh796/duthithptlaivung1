const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 8080;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("❌ Lỗi: Vui lòng điền GEMINI_API_KEY trong file .env");
    process.exit(1);
}

// URL chuẩn của Gemini 2.5 Flash Live
const GEMINI_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${GEMINI_API_KEY}`;

wss.on('connection', (clientWs) => {
    console.log('📱 Client React đã kết nối');

    let geminiWs = null;

    try {
        // Kết nối tới Google
        geminiWs = new WebSocket(GEMINI_URL);

        geminiWs.on('open', () => {
            console.log('✅ Đã kết nối tới Gemini 2.5 Flash Live');
            
            // Gửi cấu hình ban đầu (Setup Message)
            const setupMsg = {
                setup: {
                    model: "models/gemini-2.5-flash-live",
                    generation_config: {
                        response_modalities: ["AUDIO"], // Chỉ nhận Audio về để tối ưu tốc độ
                        speech_config: {
                            voice_config: {
                                prebuilt_voice_config: { voice_name: "Kore" } // Giọng đọc: Kore, Fenrir, Puck...
                            }
                        }
                    }
                }
            };
            geminiWs.send(JSON.stringify(setupMsg));
        });

        geminiWs.on('message', (data) => {
            // Nhận từ Google -> Gửi về React
            if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(data);
            }
        });

        geminiWs.on('error', (err) => {
            console.error('❌ Gemini Error:', err);
            clientWs.close();
        });

        geminiWs.on('close', () => {
            console.log('🔒 Gemini đóng kết nối');
            clientWs.close();
        });

    } catch (err) {
        console.error("Init Error:", err);
        clientWs.close();
    }

    // Nhận từ React -> Gửi lên Google
    clientWs.on('message', (data) => {
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.send(data);
        }
    });

    clientWs.on('close', () => {
        console.log('👋 Client ngắt kết nối');
        if (geminiWs && geminiWs.readyState === WebSocket.OPEN) {
            geminiWs.close();
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server Proxy đang chạy tại ws://localhost:${PORT}`);
});

