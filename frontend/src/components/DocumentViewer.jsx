import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { incrementDocumentViewCount } from '../services/firestore'
import logger from '../utils/logger'

/**
 * Document Viewer Component
 * Displays PDF, DOC, DOCX files directly in the browser
 */
export function DocumentViewer({ document, onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (document?.id) {
      // Increment view count
      incrementDocumentViewCount(document.id).catch((err) => {
        logger.warn('Failed to increment view count:', err)
      })
    }
  }, [document?.id])

  const handleLoad = () => {
    setLoading(false)
  }

  const handleError = () => {
    setLoading(false)
    setError('Không thể tải tài liệu. Vui lòng thử lại hoặc tải xuống để xem.')
  }

  const handleDownload = () => {
    if (document?.fileUrl) {
      window.open(document.fileUrl, '_blank')
      // Increment download count
      if (document.id) {
        import('../services/firestore')
          .then(({ incrementDocumentDownloadCount }) => {
            incrementDocumentDownloadCount(document.id).catch((err) => {
              logger.warn('Failed to increment download count:', err)
            })
          })
          .catch(() => {})
      }
    }
  }

  if (!document) return null

  const { fileUrl, fileType, fileName } = document

  // For PDF files, use iframe or embed
  if (fileType === 'pdf') {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/30 dark:border-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {fileName || 'Tài liệu PDF'}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                  {fileType.toUpperCase()} • {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-xs md:text-sm bg-gemini-blue text-white rounded hover:bg-gemini-blue/90 transition"
                title="Tải xuống"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải xuống
              </button>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title="Đóng"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto mb-4"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Đang tải tài liệu...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                <div className="text-center p-6">
                  <svg className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-gemini-blue text-white rounded hover:bg-gemini-blue/90 transition"
                  >
                    Tải xuống để xem
                  </button>
                </div>
              </div>
            )}
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=1&scrollbar=1`}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // For DOC/DOCX files, show download option and use Google Docs Viewer or Office Online
  const docViewerUrl = fileType === 'doc' || fileType === 'docx'
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    : null

  if (docViewerUrl) {
    return createPortal(
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-6xl h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200/30 dark:border-slate-800/30">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded">
                <svg className="w-5 h-5 text-slate-600 dark:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base md:text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {fileName || 'Tài liệu Word'}
                </h2>
                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
                  {fileType.toUpperCase()} • {document.fileSize ? `${(document.fileSize / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownload}
                className="px-3 py-1.5 text-xs md:text-sm bg-gemini-blue text-white rounded hover:bg-gemini-blue/90 transition"
                title="Tải xuống"
              >
                <svg className="w-4 h-4 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Tải xuống
              </button>
              <button
                onClick={onClose}
                className="p-1.5 md:p-2 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
                title="Đóng"
              >
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Document Viewer */}
          <div className="flex-1 overflow-hidden relative">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gemini-blue mx-auto mb-4"></div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Đang tải tài liệu...</p>
                </div>
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-800">
                <div className="text-center p-6">
                  <svg className="w-12 h-12 text-slate-400 dark:text-slate-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{error}</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-gemini-blue text-white rounded hover:bg-gemini-blue/90 transition"
                  >
                    Tải xuống để xem
                  </button>
                </div>
              </div>
            )}
            <iframe
              src={docViewerUrl}
              className="w-full h-full border-0"
              title={fileName}
              onLoad={handleLoad}
              onError={handleError}
            />
          </div>
        </div>
      </div>,
      document.body
    )
  }

  // Fallback: show download button
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg w-full max-w-md p-6">
        <div className="text-center">
          <svg className="w-16 h-16 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            {fileName || 'Tài liệu'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Định dạng {fileType.toUpperCase()} không thể xem trực tiếp. Vui lòng tải xuống để xem.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-gemini-blue text-white rounded hover:bg-gemini-blue/90 transition"
            >
              Tải xuống
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded hover:bg-slate-50 dark:hover:bg-slate-800 transition"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

