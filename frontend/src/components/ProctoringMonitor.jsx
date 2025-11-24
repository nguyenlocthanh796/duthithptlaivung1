import { useEffect, useRef, useState } from 'react'
import { analyzeFrame, loadProctoringModels } from '../utils/proctoring'

export function ProctoringMonitor({ onAlert }) {
  const videoRef = useRef(null)
  const [status, setStatus] = useState('Đang khởi động camera...')

  useEffect(() => {
    let intervalId
    const init = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus('Trình duyệt không hỗ trợ webcam hoặc không chạy qua HTTPS')
        return
      }
      try {
        await loadProctoringModels()
        const stream = await navigator.mediaDevices.getUserMedia({ video: true })
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setStatus('Camera đã sẵn sàng')
        intervalId = setInterval(async () => {
          if (videoRef.current?.readyState === 4) {
            const detections = await analyzeFrame(videoRef.current)
            if (detections.length === 0) {
              setStatus('⚠️ Không thấy học sinh')
              onAlert?.('Không phát hiện khuôn mặt')
            } else if (detections.length > 1) {
              setStatus('⚠️ Nhiều hơn 1 người trong khung hình')
              onAlert?.('Phát hiện nhiều khuôn mặt')
            } else {
              setStatus('✅ Đang giám sát bình thường')
            }
          }
        }, 4000)
      } catch (error) {
        setStatus('Không thể truy cập webcam')
        console.error(error)
      }
    }
    init()
    return () => {
      if (intervalId) clearInterval(intervalId)
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop())
      }
    }
  }, [onAlert])

  return (
    <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <p className="font-semibold text-slate-900">AI Giám thị</p>
        <span>{status}</span>
      </div>
      <video ref={videoRef} autoPlay muted playsInline className="mt-3 w-full rounded-lg bg-black/80" />
    </div>
  )
}
