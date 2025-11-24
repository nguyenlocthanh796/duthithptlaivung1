import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export function SearchBar({ onSearch, onFilterChange }) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedTime, setSelectedTime] = useState('all')
  const [showFilters, setShowFilters] = useState(false)

  const subjects = [
    { value: 'all', label: 'Tất cả môn' },
    { value: 'toan', label: 'Toán' },
    { value: 'ly', label: 'Lý' },
    { value: 'hoa', label: 'Hóa' },
    { value: 'sinh', label: 'Sinh' },
    { value: 'van', label: 'Văn' },
    { value: 'anh', label: 'Anh' },
    { value: 'su', label: 'Sử' },
    { value: 'dia', label: 'Địa' },
  ]

  const types = [
    { value: 'all', label: 'Tất cả' },
    { value: 'question', label: 'Câu hỏi' },
    { value: 'document', label: 'Tài liệu' },
    { value: 'discussion', label: 'Thảo luận' },
  ]

  const timeFilters = [
    { value: 'all', label: 'Tất cả thời gian' },
    { value: 'today', label: 'Hôm nay' },
    { value: 'week', label: 'Tuần này' },
    { value: 'month', label: 'Tháng này' },
  ]

  const handleSearch = (e) => {
    e.preventDefault()
    onSearch({
      query: searchQuery,
      subject: selectedSubject,
      type: selectedType,
      time: selectedTime,
    })
  }

  const handleFilterChange = (filterType, value) => {
    if (filterType === 'subject') setSelectedSubject(value)
    if (filterType === 'type') setSelectedType(value)
    if (filterType === 'time') setSelectedTime(value)
    
    onFilterChange({
      query: searchQuery,
      subject: filterType === 'subject' ? value : selectedSubject,
      type: filterType === 'type' ? value : selectedType,
      time: filterType === 'time' ? value : selectedTime,
    })
  }

  return (
    <div className="w-full mb-4">
      <form onSubmit={handleSearch} className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm bài viết, câu hỏi..."
              className="w-full px-4 py-2.5 pl-10 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-2 focus:ring-gemini-blue/20 text-sm"
            />
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 bg-gemini-blue text-white rounded-lg hover:bg-gemini-blue/90 transition font-medium text-sm"
          >
            Tìm kiếm
          </button>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2.5 border rounded-lg transition text-sm ${
              showFilters
                ? 'bg-gemini-blue text-white border-gemini-blue'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            🔍 Bộ lọc
          </button>
        </div>
      </form>

      {showFilters && (
        <div className="mt-3 p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Môn học */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Môn học
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => handleFilterChange('subject', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue text-sm"
              >
                {subjects.map((subject) => (
                  <option key={subject.value} value={subject.value}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Loại */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Loại
              </label>
              <select
                value={selectedType}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue text-sm"
              >
                {types.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Thời gian */}
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Thời gian
              </label>
              <select
                value={selectedTime}
                onChange={(e) => handleFilterChange('time', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue text-sm"
              >
                {timeFilters.map((filter) => (
                  <option key={filter.value} value={filter.value}>
                    {filter.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

