import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { 
  getDocuments, 
  getDocumentsByUser, 
  searchDocuments,
  deleteDocument,
  incrementDocumentViewCount,
  incrementDocumentDownloadCount
} from '../services/firestore'
import { DocumentViewer } from '../components/DocumentViewer'
import { useToast } from '../components/Toast'
import logger from '../utils/logger'

export function DocumentManagerPage() {
  const { user } = useAuth()
  const { success, error: showError } = useToast()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterUser, setFilterUser] = useState('all')
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [viewingDocument, setViewingDocument] = useState(null)

  useEffect(() => {
    loadDocuments()
  }, [filterType, filterUser])

  const loadDocuments = async () => {
    setLoading(true)
    try {
      let docs = []
      
      if (filterUser === 'my' && user) {
        docs = await getDocumentsByUser(user.uid)
      } else {
        docs = await getDocuments()
      }
      
      // Filter by type
      if (filterType !== 'all') {
        docs = docs.filter((doc) => doc.fileType === filterType)
      }
      
      setDocuments(docs)
    } catch (err) {
      logger.error('Error loading documents:', err)
      showError('Không thể tải danh sách tài liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadDocuments()
      return
    }
    
    setLoading(true)
    try {
      const results = await searchDocuments(searchTerm)
      
      // Apply filters
      let filtered = results
      if (filterType !== 'all') {
        filtered = filtered.filter((doc) => doc.fileType === filterType)
      }
      if (filterUser === 'my' && user) {
        filtered = filtered.filter((doc) => doc.uploadedBy?.uid === user.uid)
      }
      
      setDocuments(filtered)
    } catch (err) {
      logger.error('Error searching documents:', err)
      showError('Không thể tìm kiếm tài liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDocument = async (document) => {
    setViewingDocument(document)
    // Increment view count
    if (document.id) {
      try {
        await incrementDocumentViewCount(document.id)
      } catch (err) {
        logger.warn('Failed to increment view count:', err)
      }
    }
  }

  const handleDownloadDocument = async (document) => {
    if (document.fileUrl) {
      window.open(document.fileUrl, '_blank')
      // Increment download count
      if (document.id) {
        try {
          await incrementDocumentDownloadCount(document.id)
        } catch (err) {
          logger.warn('Failed to increment download count:', err)
        }
      }
    }
  }

  const handleDeleteDocument = async (documentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      return
    }
    
    try {
      await deleteDocument(documentId)
      setDocuments(documents.filter((doc) => doc.id !== documentId))
      success('Đã xóa tài liệu thành công')
    } catch (err) {
      logger.error('Error deleting document:', err)
      showError('Không thể xóa tài liệu')
    }
  }

  const getFileIcon = (fileType) => {
    switch (fileType?.toLowerCase()) {
      case 'pdf':
        return (
          <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        )
      case 'doc':
      case 'docx':
        return (
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        )
      default:
        return (
          <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
            <svg className="w-6 h-6 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
        )
    }
  }

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A'
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return new Intl.DateTimeFormat('vi-VN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-6 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
            Quản lý Tài liệu
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Xem và quản lý tất cả tài liệu đã được tải lên
          </p>
        </div>

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/30 dark:border-slate-700/30 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gemini-blue bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                />
                <button
                  onClick={handleSearch}
                  className="px-4 py-2 bg-gemini-blue text-white rounded-lg hover:bg-gemini-blue/90 transition"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gemini-blue bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
              >
                <option value="all">Tất cả định dạng</option>
                <option value="pdf">PDF</option>
                <option value="doc">DOC</option>
                <option value="docx">DOCX</option>
              </select>

              {user && (
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-gemini-blue bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="my">Tài liệu của tôi</option>
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Documents Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Đang tải tài liệu...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200/30 dark:border-slate-700/30">
            <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-600 dark:text-slate-400">Không có tài liệu nào</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200/30 dark:border-slate-700/30 p-4 hover:shadow-lg transition cursor-pointer"
                onClick={() => handleViewDocument(doc)}
              >
                <div className="flex items-start gap-3 mb-3">
                  {getFileIcon(doc.fileType)}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate mb-1">
                      {doc.fileName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {doc.fileType?.toUpperCase()} • {formatFileSize(doc.fileSize)}
                    </p>
                  </div>
                </div>

                {doc.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {doc.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-3">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    {doc.viewCount || 0} lượt xem
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {doc.downloadCount || 0} lượt tải
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200/30 dark:border-slate-700/30">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {doc.uploadedBy?.name || 'Người dùng'}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownloadDocument(doc)
                      }}
                      className="p-1.5 text-gemini-blue hover:bg-gemini-blue/10 rounded transition"
                      title="Tải xuống"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                    {(user?.uid === doc.uploadedBy?.uid || user?.roles?.includes('admin')) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteDocument(doc.id)
                        }}
                        className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition"
                        title="Xóa"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  )
}

