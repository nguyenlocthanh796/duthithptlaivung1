import { useEffect, useState } from 'react'

// Lazy load recharts components to avoid React 19 compatibility issues
let RechartsComponents = null
const loadRecharts = async () => {
  if (!RechartsComponents) {
    try {
      // Ensure React is fully available before loading recharts
      // Check if React.forwardRef exists (React 19 compatibility)
      const checkReactReady = () => {
        try {
          // Import React to check if it's available
          const React = require('react')
          if (!React || !React.forwardRef) {
            return false
          }
          return true
        } catch {
          // If require fails, try to access global React
          if (typeof window !== 'undefined' && window.React && window.React.forwardRef) {
            return true
          }
          return false
        }
      }
      
      // Wait for React to be ready (with timeout)
      let attempts = 0
      while (!checkReactReady() && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100))
        attempts++
      }
      
      if (!checkReactReady()) {
        console.warn('React may not be fully ready, but proceeding with recharts load')
      }
      
      // Additional delay to ensure React is fully initialized
      await new Promise(resolve => setTimeout(resolve, 200))
      
      // Use dynamic import - this ensures recharts is only loaded when Charts component is used
      const recharts = await import('recharts')
      RechartsComponents = {
        LineChart: recharts.LineChart,
        BarChart: recharts.BarChart,
        Line: recharts.Line,
        Bar: recharts.Bar,
        ResponsiveContainer: recharts.ResponsiveContainer,
        Tooltip: recharts.Tooltip,
        XAxis: recharts.XAxis,
        YAxis: recharts.YAxis,
      }
    } catch (error) {
      console.error('Failed to load recharts:', error)
      return null
    }
  }
  return RechartsComponents
}

export function LineChartWrapper({ data }) {
  const [components, setComponents] = useState(null)

  useEffect(() => {
    loadRecharts().then((comps) => {
      if (comps) {
        setComponents(comps)
      }
    })
  }, [])

  if (!components) {
    return <div className="mt-8 text-center text-sm text-slate-500">Đang tải biểu đồ...</div>
  }

  const { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } = components

  if (!data || data.length === 0) {
    return <p className="mt-8 text-center text-sm text-slate-500">Chưa có bài nộp nào.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data}>
        <XAxis dataKey="name" hide />
        <YAxis domain={[0, 'dataMax']} />
        <Tooltip />
        <Line type="monotone" dataKey="score" stroke="#4285F4" strokeWidth={3} />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function BarChartWrapper({ data }) {
  const [components, setComponents] = useState(null)

  useEffect(() => {
    loadRecharts().then((comps) => {
      if (comps) {
        setComponents(comps)
      }
    })
  }, [])

  if (!components) {
    return <div className="mt-8 text-center text-sm text-slate-500">Đang tải biểu đồ...</div>
  }

  const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } = components

  if (!data || data.length === 0) {
    return <p className="mt-8 text-center text-sm text-slate-500">Chưa có dữ liệu thống kê.</p>
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data}>
        <XAxis dataKey="name" hide />
        <YAxis domain={[0, 'dataMax']} />
        <Tooltip />
        <Bar dataKey="score" fill="#34A853" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

