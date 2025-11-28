const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json()); // Parse JSON bodies
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

// HTTP API endpoint để generate exam questions
app.post('/api/generate-exam', async (req, res) => {
    try {
        const { topic, difficulty, count } = req.body;

        if (!topic || !count) {
            return res.status(400).json({ error: 'Missing required fields: topic, count' });
        }

        // Map độ khó sang tiếng Việt
        const difficultyMap = {
            'De': 'Dễ',
            'TB': 'Trung bình',
            'Kho': 'Khó',
            'SieuKho': 'Vận dụng cao'
        };

        const difficultyText = difficultyMap[difficulty] || 'Trung bình';

        // Tạo prompt cho Gemini
        const prompt = `Hãy tạo ${count} câu hỏi trắc nghiệm về chủ đề "${topic}" với độ khó ${difficultyText}.

Yêu cầu:
- Mỗi câu hỏi có 4 đáp án (A, B, C, D)
- Chỉ có 1 đáp án đúng
- Câu hỏi phải rõ ràng, chính xác
- Đáp án phải hợp lý và có tính phân loại

Trả về dưới dạng JSON array với format:
[
  {
    "text": "Nội dung câu hỏi?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correct": 0
  }
]
Trong đó "correct" là index của đáp án đúng (0=A, 1=B, 2=C, 3=D).

Chỉ trả về JSON, không có text thêm.`;

        // Gọi Gemini API
        const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }]
                })
            }
        );

        if (!geminiResponse.ok) {
            throw new Error(`Gemini API error: ${geminiResponse.statusText}`);
        }

        const geminiData = await geminiResponse.json();
        const responseText = geminiData.candidates[0].content.parts[0].text;

        // Parse JSON từ response
        let questions;
        try {
            // Tìm JSON trong response (có thể có markdown code blocks)
            const jsonMatch = responseText.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                questions = JSON.parse(jsonMatch[0]);
            } else {
                throw new Error('No JSON found in response');
            }
        } catch (parseError) {
            // Fallback: Tạo mock questions nếu parse fail
            console.warn('Failed to parse Gemini response, using fallback:', parseError);
            questions = Array.from({ length: count }).map((_, i) => ({
                id: Date.now() + i,
                text: `Câu hỏi ${i + 1} về ${topic}?`,
                options: [
                    `Đáp án A cho câu ${i + 1}`,
                    `Đáp án B cho câu ${i + 1}`,
                    `Đáp án C cho câu ${i + 1}`,
                    `Đáp án D cho câu ${i + 1}`
                ],
                correct: Math.floor(Math.random() * 4),
                type: 'ai'
            }));
        }

        // Đảm bảo số lượng câu hỏi đúng
        if (questions.length > count) {
            questions = questions.slice(0, count);
        }

        // Thêm id và type cho mỗi câu hỏi
        questions = questions.map((q, i) => ({
            id: Date.now() + i,
            text: q.text || `Câu hỏi ${i + 1} về ${topic}?`,
            options: q.options || ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
            correct: q.correct !== undefined ? q.correct : Math.floor(Math.random() * 4),
            type: 'ai'
        }));

        res.json({ questions });
    } catch (error) {
        console.error('Error generating exam:', error);
        res.status(500).json({ error: error.message });
    }
});

server.listen(PORT, () => {
    console.log(`🚀 Server Proxy đang chạy tại ws://localhost:${PORT}`);
    console.log(`📝 HTTP API available at http://localhost:${PORT}/api/generate-exam`);
});

