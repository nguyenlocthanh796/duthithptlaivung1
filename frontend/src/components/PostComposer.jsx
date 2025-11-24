import { useState } from 'react'
import { uploadMedia } from '../services/api'
import { createPost } from '../services/firestore'
import { useToast } from './Toast'

export function PostComposer({ user }) {
  const { success, error: showError } = useToast()
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [documentFile, setDocumentFile] = useState(null)
  const [tags, setTags] = useState([])
  const [tagInput, setTagInput] = useState('')
  const [loading, setLoading] = useState(false)

  const suggestedTags = ['toan12', 'hinhhoc', 'luonggiac', 'daiso', 'giaitich', 'vatly', 'hoahoc', 'sinhhoc', 'vanhoc', 'tienganh', 'lichsu', 'dialy']

  const handleAddTag = (tag) => {
    const normalizedTag = tag.toLowerCase().trim().replace(/\s+/g, '')
    if (normalizedTag && !tags.includes(normalizedTag) && tags.length < 5) {
      setTags([...tags, normalizedTag])
      setTagInput('')
    }
  }

  const handleTagInputKeyDown = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault()
      handleAddTag(tagInput)
    }
  }

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!text.trim()) {
      showError('Vui lòng nhập nội dung bài viết')
      return
    }
    setLoading(true)
    try {
      let imageUrl = null
      let documentUrl = null
      let documentType = null

      if (imageFile) {
        try {
          const uploadResponse = await uploadMedia(imageFile)
          
          if (uploadResponse?.driveLink) {
            imageUrl = uploadResponse.driveLink
            success('Đã tải ảnh lên Google Drive thành công!')
          } else if (uploadResponse?.uploaded === false) {
            // Google Drive not available, but file was saved
            showError('Google Drive chưa được cấu hình. File đã được lưu tạm nhưng chưa upload lên Drive. Vui lòng cấu hình credentials.json')
            setLoading(false)
            return
          } else {
            throw new Error('Không nhận được link từ server')
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError)
          const errorMessage = uploadError.response?.data?.detail || 
                              uploadError.message || 
                              'Không thể tải ảnh lên. Vui lòng kiểm tra backend có đang chạy và CORS đã được cấu hình đúng.'
          showError(errorMessage)
          setLoading(false)
          return
        }
      }

      if (documentFile) {
        try {
          const uploadResponse = await uploadMedia(documentFile)
          
          if (uploadResponse?.driveLink) {
            documentUrl = uploadResponse.driveLink
            documentType = documentFile.name.split('.').pop().toLowerCase()
            success('Đã tải tài liệu lên Google Drive thành công!')
          } else if (uploadResponse?.uploaded === false) {
            // Google Drive not available, but file was saved
            showError('Google Drive chưa được cấu hình. File đã được lưu tạm nhưng chưa upload lên Drive. Vui lòng cấu hình credentials.json')
            setLoading(false)
            return
          } else {
            throw new Error('Không nhận được link từ server')
          }
        } catch (uploadError) {
          console.error('Error uploading document:', uploadError)
          const errorMessage = uploadError.response?.data?.detail || 
                              uploadError.message || 
                              'Không thể tải tài liệu lên. Vui lòng kiểm tra backend có đang chạy và CORS đã được cấu hình đúng.'
          showError(errorMessage)
          setLoading(false)
          return
        }
      }

      await createPost({
        text,
        imageUrl,
        documentUrl,
        documentType,
        tags: tags.length > 0 ? tags : undefined,
        author: {
          uid: user.uid,
          name: user.displayName,
          photoURL: user.photoURL,
        },
      })
      setText('')
      setImageFile(null)
      setDocumentFile(null)
      setTags([])
      setTagInput('')
      // Reset file inputs
      const imageInput = document.querySelector('#image-input')
      const docInput = document.querySelector('#document-input')
      if (imageInput) imageInput.value = ''
      if (docInput) docInput.value = ''
      success('Đã đăng bài thành công!')
    } catch (error) {
      console.error('Error creating post:', error)
      showError('Không thể đăng bài. Vui lòng thử lại sau.')
    } finally {
      setLoading(false)
    }
  }

  const getFileTypeLabel = (file) => {
    if (!file) return ''
    const ext = file.name.split('.').pop().toLowerCase()
    const types = {
      pdf: 'PDF',
      doc: 'Word',
      docx: 'Word',
      png: 'Ảnh',
      jpg: 'Ảnh',
      jpeg: 'Ảnh',
      webp: 'Ảnh',
      gif: 'Ảnh',
    }
    return types[ext] || 'Tệp'
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    const imageInput = document.querySelector('#image-input')
    if (imageInput) imageInput.value = ''
  }

  const handleRemoveDocument = () => {
    setDocumentFile(null)
    const docInput = document.querySelector('#document-input')
    if (docInput) docInput.value = ''
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm"
    >
      <textarea
        className="w-full resize-none border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 p-4 text-base focus:border-gemini-blue focus:outline-none focus:ring-2 focus:ring-gemini-blue/20 rounded-lg"
        rows="4"
        placeholder="Đề bài: Giải phương trình lượng giác sau: $$\sin 2x + \sqrt{3}\cos 2x = \sqrt{2}$$"
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={loading}
      />
      
      {/* Tags Input */}
      <div className="mt-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-gemini-blue/10 text-gemini-blue px-2.5 py-1 rounded-full text-xs font-medium"
            >
              #{tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-gemini-blue/70"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagInputKeyDown}
            placeholder="Thêm tag (Enter để thêm)"
            className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:border-gemini-blue focus:outline-none focus:ring-1 focus:ring-gemini-blue"
            disabled={loading || tags.length >= 5}
          />
          {tags.length < 5 && (
            <button
              type="button"
              onClick={() => handleAddTag(tagInput)}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-700 transition"
            >
              Thêm
            </button>
          )}
        </div>
        {tags.length < 5 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestedTags
              .filter((tag) => !tags.includes(tag))
              .slice(0, 6)
              .map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleAddTag(tag)}
                  className="px-2 py-1 text-xs text-slate-600 hover:text-gemini-blue hover:bg-gemini-blue/10 rounded transition"
                >
                  #{tag}
                </button>
              ))}
          </div>
        )}
      </div>

      {/* File attachments display */}
      {(imageFile || documentFile) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {imageFile && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-700">📷 {imageFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="text-slate-500 hover:text-red-500 text-sm"
              >
                ✕
              </button>
            </div>
          )}
          {documentFile && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <span className="text-sm text-slate-700">📄 {documentFile.name}</span>
              <button
                type="button"
                onClick={handleRemoveDocument}
                className="text-slate-500 hover:text-red-500 text-sm"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <label className="flex cursor-pointer items-center gap-2 border border-slate-200 px-4 py-2 rounded-lg hover:border-gemini-blue hover:bg-gemini-blue/5 transition">
            <span className="text-slate-600 text-sm">📷 Ảnh</span>
            <input
              id="image-input"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => setImageFile(event.target.files[0])}
              disabled={loading}
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 border border-slate-200 px-4 py-2 rounded-lg hover:border-gemini-blue hover:bg-gemini-blue/5 transition">
            <span className="text-slate-600 text-sm">📄 Tài liệu</span>
            <input
              id="document-input"
              type="file"
              accept="application/pdf,.doc,.docx"
              className="hidden"
              onChange={(event) => setDocumentFile(event.target.files[0])}
              disabled={loading}
            />
          </label>
        </div>
        
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-gemini-blue to-gemini-blue/90 px-6 py-2.5 text-base font-semibold text-white rounded-lg transition hover:from-gemini-blue/90 hover:to-gemini-blue/80 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              <span>Đang đăng...</span>
            </>
          ) : (
            <>
              <span>📤</span>
              <span>Đăng bài</span>
            </>
          )}
        </button>
      </div>
      
      {!imageFile && !documentFile && (
        <p className="mt-2 text-xs text-slate-500">
          Hỗ trợ: Ảnh (PNG, JPG, WEBP, GIF) và Tài liệu (PDF, DOC, DOCX)
        </p>
      )}
    </form>
  )
}