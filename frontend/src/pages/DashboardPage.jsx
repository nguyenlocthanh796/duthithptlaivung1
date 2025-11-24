import { useEffect, useState } from 'react'
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts'
import { watchSubmissions } from '../services/firestore'
import { ThreeColumnLayout } from '../components/ThreeColumnLayout'

export function DashboardPage() {
  const [submissions, setSubmissions] = useState([])

  useEffect(() => {
    const unsub = watchSubmissions(setSubmissions)
    return () => unsub()
  }, [])

  const chartData = submissions.map((item) => ({
    name: item.userId,
    score: item.score,
  }))

  const rightSidebar = (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 mb-2">📊 Thống kê</h4>
        <div className="p-2.5 bg-gemini-blue/10 border border-gemini-blue/20">
          <p className="text-xs text-slate-600 mb-1">
            <strong>Tổng số bài nộp:</strong> {submissions.length}
          </p>
          <p className="text-xs text-slate-600">
            <strong>Điểm trung bình:</strong> {submissions.length > 0 
              ? (submissions.reduce((sum, s) => sum + (s.score || 0), 0) / submissions.length).toFixed(1)
              : '0'}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <ThreeColumnLayout rightSidebar={rightSidebar}>
      <div className="space-y-6">
        <section className="bg-white dark:bg-slate-900 p-6 border border-slate-200/50 dark:border-slate-800/50 rounded-lg">
          <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Dashboard</p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Thống kê & Phân tích</h2>
        </section>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Điểm số gần đây</h2>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 'dataMax']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="score" stroke="#4285F4" strokeWidth={3} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="mt-8 text-center text-sm text-slate-500">Chưa có bài nộp nào.</p>
            )}
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Phân phối điểm</h2>
            {chartData.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" hide />
                  <YAxis domain={[0, 'dataMax']} />
                  <Tooltip />
                  <Bar dataKey="score" fill="#34A853" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="mt-8 text-center text-sm text-slate-500">Chưa có dữ liệu thống kê.</p>
            )}
          </div>
        </div>
      </div>
    </ThreeColumnLayout>
  )
}
