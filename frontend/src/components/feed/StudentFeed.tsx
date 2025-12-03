import React, { useEffect, useMemo, useState, ChangeEvent, FormEvent } from 'react';
import { Home, MessageCircle, Filter as FilterIcon, Image as ImageIcon, Send, Trash2, MoreHorizontal, FileText, X, Edit2, Check, Loader2, ThumbsUp, Calculator } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { Post, PostCreate, postsAPI, Comment, commentsAPI, Attachment, uploadsAPI } from '../../services/api';
import { postsAPIEnhanced } from '../../services/api-enhanced';
import { Card, Badge, Button } from '../ui';
import { MathText, MathEditor } from '../math';
import { useAuth } from '../../contexts/AuthContext';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useDebounce } from '../../hooks/useDebounce';
import { handleAPIError } from '../../utils/errorHandler';
import { LoadingSpinner, EmptyState } from '../common';

interface StudentFeedProps {
  showToast: (msg: string, type: 'success' | 'error') => void;
  onAskWithContext?: (context: string) => void;
}

const StudentFeed: React.FC<StudentFeedProps> = ({ showToast, onAskWithContext }) => {
  const { currentUser } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [searchTerm] = useState<string>('');
  const debouncedSearch = useDebounce(searchTerm, 500);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  // Composer state
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('toan');
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [mathFormula, setMathFormula] = useState('');
  // Mới: hỗ trợ nhiều ảnh (tối đa 5)
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  // Mới: hỗ trợ tài liệu
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [creating, setCreating] = useState(false);

  // Comment state
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState<string | null>(null);
  const [creatingCommentFor, setCreatingCommentFor] = useState<string | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  
  // Comment edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentContent, setEditingCommentContent] = useState<string>('');
  const [updatingCommentFor, setUpdatingCommentFor] = useState<string | null>(null);
  
  // Reactions dropdown state
  const [showReactionsFor, setShowReactionsFor] = useState<string | null>(null);

  // Post edit state (đơn giản: cho phép sửa nội dung text + subject)
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string>('');
  const [editingSubject, setEditingSubject] = useState<string>('toan');

  const PAGE_SIZE = 20;

  // Tải posts với enhanced API support
  const loadPosts = async (reset = false) => {
    if (loading || loadingMore) return;

    try {
      if (reset) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Thêm timeout để tránh stuck ở loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000); // 10 seconds
      });

      // Try enhanced API first
      try {
        const response = await Promise.race([
          postsAPIEnhanced.getAll({
            subject: subjectFilter !== 'all' ? subjectFilter : undefined,
            limit: PAGE_SIZE,
            offset: reset ? 0 : posts.length,
            search: debouncedSearch || undefined,
          }),
          timeoutPromise,
        ]) as any;

        if (response.success && response.data) {
          const newPosts = response.data;
          if (reset) {
            setPosts(newPosts);
          } else {
            setPosts((prev) => [...prev, ...newPosts]);
          }
          setHasMore(response.pagination.has_more);
        } else {
          // Nếu response không có data, set empty array
          if (reset) {
            setPosts([]);
          }
          setHasMore(false);
        }
      } catch (enhancedError) {
        // Fallback to basic API
        try {
          const data = await Promise.race([
            postsAPI.getAll({
              subject: subjectFilter !== 'all' ? subjectFilter : undefined,
              limit: PAGE_SIZE,
              offset: reset ? 0 : posts.length,
            }),
            timeoutPromise,
          ]) as any;
          
          if (reset) {
            setPosts(Array.isArray(data) ? data : []);
          } else {
            setPosts((prev) => [...prev, ...(Array.isArray(data) ? data : [])]);
          }
          setHasMore(Array.isArray(data) && data.length === PAGE_SIZE);
        } catch (basicError) {
          // Nếu cả hai API đều fail, set empty array và hiển thị error
          if (reset) {
            setPosts([]);
          }
          setHasMore(false);
          throw basicError; // Re-throw để vào catch block chính
        }
      }
    } catch (error: any) {
      // Nếu là lần đầu load và có error, set empty array để hiển thị empty state
      if (reset && posts.length === 0) {
        setPosts([]);
      }
      const errorMessage = handleAPIError(error);
      // Chỉ show toast nếu không phải timeout (để tránh spam)
      if (!errorMessage.includes('timeout')) {
        showToast('Không thể tải bảng tin: ' + errorMessage, 'error');
      }
    } finally {
      // Đảm bảo loading luôn được set về false
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  // Load initial posts
  useEffect(() => {
    void loadPosts(true);
  }, [subjectFilter, debouncedSearch]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (subjectFilter !== 'all' && post.subject !== subjectFilter) return false;
      if (
        gradeFilter !== 'all' &&
        post.grade !== null &&
        post.grade !== undefined &&
        String(post.grade) !== gradeFilter
      ) {
        return false;
      }
      if (tagFilter.trim()) {
        const tag = tagFilter.trim().toLowerCase();
        const haystack = (post.aiTags || []).join(' ').toLowerCase();
        if (!haystack.includes(tag)) return false;
      }
      return true;
    });
  }, [posts, subjectFilter, gradeFilter, tagFilter]);

  const visiblePosts = filteredPosts;

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    void loadPosts(false);
  };

  // Infinite scroll với custom hook
  const loadMoreRef = useInfiniteScroll({
    hasMore,
    loading: loadingMore,
    onLoadMore: handleLoadMore,
  });

  const reloadPost = async (postId: string) => {
    try {
      const updatedPost = await postsAPI.getById(postId);
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)));
    } catch (error: any) {
      // Chỉ log trong development
      if ((import.meta as any).env?.DEV) {
        console.error('Error reloading post:', error);
      }
      // Không throw error để không làm gián đoạn UI
    }
  };

  const loadComments = async (postId: string) => {
    // Nếu đã có comments, không cần load lại
    if (commentsByPost[postId]) return;
    
    // Kiểm tra xem post có tồn tại trong danh sách không
    const postExists = posts.some(p => p.id === postId);
    if (!postExists) {
      // Post không tồn tại, khởi tạo mảng rỗng và không gọi API
      setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      return;
    }
    
    try {
      setLoadingCommentsFor(postId);
      // commentsAPI.getForPost sẽ tự động trả về [] nếu gặp lỗi 404
      const data = await commentsAPI.getForPost(postId, 50);
      setCommentsByPost((prev) => ({ ...prev, [postId]: data }));
      // Tự động expand comments khi load xong
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    } catch (error: any) {
      // Chỉ xử lý các lỗi khác 404 (404 đã được xử lý trong commentsAPI.getForPost)
      console.error('Error loading comments:', error);
      showToast('Không thể tải bình luận: ' + (error.message || 'Lỗi không xác định'), 'error');
      // Vẫn khởi tạo mảng rỗng để có thể comment
      setCommentsByPost((prev) => ({ ...prev, [postId]: [] }));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    } finally {
      setLoadingCommentsFor((prev) => (prev === postId ? null : prev));
    }
  };

  const handleCreateComment = async (postId: string) => {
    const text = (commentInput[postId] || '').trim();
    if (!text || creatingCommentFor === postId) return;
    
    if (!currentUser?.uid) {
      showToast('Vui lòng đăng nhập để bình luận', 'error');
      return;
    }
    
    // Kiểm tra post có tồn tại trong danh sách không
    const postExists = posts.some(p => p.id === postId);
    if (!postExists) {
      showToast('Bài viết không tồn tại. Vui lòng làm mới trang.', 'error');
      return;
    }
    
    try {
      setCreatingCommentFor(postId);
      const created = await commentsAPI.create(postId, { content: text });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: [created, ...(prev[postId] || [])],
      }));
      setCommentInput((prev) => ({ ...prev, [postId]: '' }));
      // Tự động expand comments khi tạo comment mới
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
      // tăng đếm comment ở post tương ứng
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: (p.comments || 0) + 1 } : p))
      );
      showToast('Đã gửi bình luận', 'success');
    } catch (error: any) {
      const errorMessage = handleAPIError(error);
      if (error.status === 404) {
        showToast('Không tìm thấy bài viết. Vui lòng làm mới trang.', 'error');
        // Remove post from state if it doesn't exist
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } else if (error.status === 401) {
        showToast('Vui lòng đăng nhập để bình luận.', 'error');
      } else if (error.status === 403) {
        showToast('Bạn không có quyền bình luận.', 'error');
      } else {
        showToast('Không thể gửi bình luận: ' + errorMessage, 'error');
      }
    } finally {
      setCreatingCommentFor(null);
    }
  };

  const handleDeleteComment = async (postId: string, comment: Comment) => {
    if (!window.confirm('Xoá bình luận này?')) return;
    try {
      await commentsAPI.delete(postId, comment.id);
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== comment.id),
      }));
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: Math.max(0, (p.comments || 0) - 1) } : p
        )
      );
      showToast('Đã xoá bình luận', 'success');
    } catch (error: any) {
      if ((import.meta as any).env?.DEV) {
        console.error('Error deleting comment:', error);
      }
      const errorMessage = error.message || 'Lỗi không xác định';
      if (error.status === 401) {
        showToast('Vui lòng đăng nhập để xoá bình luận', 'error');
      } else if (error.status === 404) {
        showToast('Bình luận không tồn tại', 'error');
      } else {
        showToast('Không thể xoá bình luận: ' + errorMessage, 'error');
      }
    }
  };

  const startEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditingCommentContent(comment.content);
  };

  const cancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentContent('');
  };

  const handleUpdateComment = async (postId: string, commentId: string) => {
    const text = editingCommentContent.trim();
    if (!text) {
      showToast('Nội dung bình luận không được để trống', 'error');
      return;
    }
    try {
      setUpdatingCommentFor(commentId);
      const updated = await commentsAPI.update(postId, commentId, { content: text });
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === commentId ? updated : c)),
      }));
      cancelEditComment();
      showToast('Đã cập nhật bình luận', 'success');
    } catch (error: any) {
      if ((import.meta as any).env?.DEV) {
        console.error('Error updating comment:', error);
      }
      const errorMessage = error.message || 'Lỗi không xác định';
      if (error.status === 401) {
        showToast('Vui lòng đăng nhập để cập nhật bình luận', 'error');
      } else if (error.status === 404) {
        showToast('Bình luận không tồn tại', 'error');
      } else {
        showToast('Không thể cập nhật bình luận: ' + errorMessage, 'error');
      }
    } finally {
      setUpdatingCommentFor(null);
    }
  };

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Giới hạn tối đa 5 ảnh
    const remainingSlots = 5 - imageFiles.length;
    const filesToAdd = files.slice(0, remainingSlots);
    if (filesToAdd.length < files.length) {
      showToast(`Chỉ có thể thêm tối đa 5 ảnh. Đã thêm ${filesToAdd.length} ảnh.`, 'error');
    }

    try {
      const compressedFiles: File[] = [];
      const previewUrls: string[] = [];

      for (const file of filesToAdd) {
        const options = {
          maxWidthOrHeight: 1280,
          initialQuality: 0.6,
          fileType: 'image/webp',
          useWebWorker: true,
        } as const;

        const compressed = await imageCompression(file, options);
        compressedFiles.push(compressed);
        previewUrls.push(URL.createObjectURL(compressed));
      }

      setImageFiles((prev) => [...prev, ...compressedFiles]);
      setImagePreviews((prev) => [...prev, ...previewUrls]);
    } catch (err: any) {
      console.error('Error compressing images:', err);
      showToast('Không thể nén ảnh, thử lại file khác nhé', 'error');
    }
  };

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleDocumentChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Kiểm tra loại file
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Chỉ chấp nhận file PDF hoặc Word (.pdf, .doc, .docx)', 'error');
      return;
    }

    try {
      setUploadingDocs(true);
      const uploaded = await uploadsAPI.uploadDocument(file);
      setAttachments((prev) => [...prev, uploaded]);
      showToast('Đã tải tài liệu lên', 'success');
    } catch (err: any) {
      console.error('Error uploading document:', err);
      showToast('Không thể tải tài liệu: ' + (err.message || 'Lỗi không xác định'), 'error');
    } finally {
      setUploadingDocs(false);
      // Reset input để có thể chọn lại file cùng tên
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || creating) return;

    try {
      setCreating(true);
      
      // Nén tất cả ảnh thành base64
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
        const dataUrl = await imageCompression.getDataUrlFromFile(file);
        imageUrls.push(dataUrl);
      }

      const payload: PostCreate = {
        content: text,
        subject,
        post_type: imageUrls.length > 0 ? 'image' : attachments.length > 0 ? 'document' : 'text',
        // Backward compatibility: giữ image_url cho bài 1 ảnh
        image_url: imageUrls[0] || undefined,
        // Mới: mảng ảnh
        image_urls: imageUrls.length > 0 ? imageUrls : undefined,
        // Mới: mảng tài liệu
        attachments: attachments.length > 0 ? attachments : undefined,
      };

      const created = await postsAPI.create(payload);
      // Đưa bài mới lên đầu feed
      setPosts((prev) => [created, ...prev]);
      
      // Reset composer
      setContent('');
      setImageFiles([]);
      imagePreviews.forEach((url) => URL.revokeObjectURL(url));
      setImagePreviews([]);
      setAttachments([]);
      showToast('Đăng bài thành công!', 'success');
    } catch (err: any) {
      console.error('Error creating post:', err);
      showToast(err.message || 'Không thể đăng bài', 'error');
    } finally {
      setCreating(false);
    }
  };

  const startEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setEditingContent(post.content);
    setEditingSubject(post.subject || 'toan');
  };

  const cancelEditPost = () => {
    setEditingPostId(null);
    setEditingContent('');
    setEditingSubject('toan');
  };

  const handleUpdatePost = async (post: Post) => {
    const text = editingContent.trim();
    if (!text) {
      showToast('Nội dung không được để trống', 'error');
      return;
    }
    try {
      const updated = await postsAPI.update(post.id, {
        content: text,
        subject: editingSubject,
      });
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, ...updated } : p)));
      cancelEditPost();
      showToast('Đã cập nhật bài viết', 'success');
    } catch (error: any) {
      console.error('Error updating post:', error);
      showToast('Không thể cập nhật bài viết: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!window.confirm('Xoá bài viết này?')) return;
    if (!currentUser?.uid) {
      showToast('Vui lòng đăng nhập để xoá bài viết', 'error');
      return;
    }
    try {
      await postsAPI.delete(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
      showToast('Đã xoá bài viết', 'success');
    } catch (error: any) {
      const errorMessage = handleAPIError(error);
      if (error.status === 405) {
        showToast('Phương thức không được phép. Vui lòng thử lại.', 'error');
      } else if (error.status === 403) {
        showToast('Bạn không có quyền xoá bài viết này', 'error');
      } else if (error.status === 404) {
        showToast('Bài viết không tồn tại', 'error');
        setPosts((prev) => prev.filter((p) => p.id !== post.id));
      } else {
        showToast('Không thể xoá bài viết: ' + errorMessage, 'error');
      }
    }
  };

  // Hiển thị loading chỉ khi đang load lần đầu và chưa có posts
  if (loading && posts.length === 0) {
    return <LoadingSpinner size="lg" text="Đang tải bảng tin..." fullScreen={false} />;
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Composer tạo bài viết - Modern Facebook style */}
      <Card className="overflow-hidden" padding="none">
        <form onSubmit={handleCreatePost}>
          <div className="p-4">
          <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
              HS
            </div>
            <div className="flex-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[44px] max-h-40 resize-none border-none bg-neutral-100 rounded-2xl px-4 py-3 text-[15px] text-neutral-900 placeholder:text-neutral-500 outline-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                placeholder="Cậu đang nghĩ gì?"
                disabled={creating}
                rows={1}
                style={{ lineHeight: '1.5' }}
              />
            </div>
          </div>
          
          {/* Preview grid ảnh */}
          {imagePreviews.length > 0 && (
              <div className={`mt-4 grid gap-2 ${
                imagePreviews.length === 1 ? 'grid-cols-1' : 
                imagePreviews.length === 2 ? 'grid-cols-2' : 
                'grid-cols-2'
              }`}>
              {imagePreviews.map((url, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden bg-neutral-100">
                  <img
                    src={url}
                    alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/70 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/90 transition-all hover:scale-110"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {/* Preview tài liệu */}
          {attachments.length > 0 && (
              <div className="mt-4 space-y-2">
              {attachments.map((att, idx) => (
                <div
                  key={idx}
                    className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 hover:bg-neutral-100 transition-colors"
                >
                    <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
                      <FileText size={20} className="text-primary-600" />
                    </div>
                  <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 truncate">
                      {att.file_name}
                    </div>
                      <div className="text-xs text-neutral-500">
                      {(att.file_size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAttachment(idx)}
                      className="w-8 h-8 rounded-lg text-neutral-500 hover:text-error-600 hover:bg-error-50 shrink-0 transition-all flex items-center justify-center"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Math Editor */}
          {showMathEditor && (
            <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-neutral-700">Công thức toán học</span>
                <button
                  type="button"
                  onClick={() => {
                    if (mathFormula) {
                      // Chèn công thức vào content
                      const formula = mathFormula.trim();
                      const mathBlock = `$$${formula}$$`;
                      setContent((prev) => prev + (prev ? '\n\n' : '') + mathBlock);
                      setMathFormula('');
                    }
                    setShowMathEditor(false);
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  Chèn vào bài viết
                </button>
              </div>
              <MathEditor
                value={mathFormula}
                onChange={setMathFormula}
                placeholder="Nhập công thức toán học..."
                inline={false}
                className="w-full"
              />
              <div className="mt-2 text-xs text-neutral-500">
                Tip: Nhập công thức và nhấn "Chèn vào bài viết" để thêm vào nội dung
              </div>
            </div>
          )}
        </div>
        
          {/* Thanh công cụ Modern */}
          <div className="border-t border-neutral-200 px-4 py-3 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-2 flex-1 flex-wrap">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
                className="text-sm text-neutral-700 bg-white border border-neutral-300 rounded-lg px-3 py-1.5 outline-none cursor-pointer font-medium hover:border-primary-500 focus:ring-2 focus:ring-primary-500 transition-all"
              disabled={creating}
            >
              <option value="toan">📐 Toán</option>
              <option value="ly">⚛️ Lý</option>
              <option value="hoa">🧪 Hóa</option>
              <option value="sinh">🧬 Sinh</option>
              <option value="van">📝 Văn</option>
              <option value="anh">🌐 Anh</option>
            </select>
              <div className="h-6 w-px bg-neutral-300" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowMathEditor(!showMathEditor);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition text-sm font-medium ${
                  showMathEditor
                    ? 'bg-primary-100 text-primary-700'
                    : 'hover:bg-neutral-100 text-neutral-700'
                }`}
              >
                <Calculator size={18} className="text-primary-600" />
                <span className="hidden sm:inline">Công thức</span>
              </button>
              <div className="h-6 w-px bg-neutral-300" />
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer transition text-neutral-700 text-sm font-medium">
                <ImageIcon size={18} className="text-success-600" />
                <span className="hidden sm:inline">Ảnh</span>
                {imageFiles.length > 0 && <Badge variant="primary" size="sm">{imageFiles.length}/5</Badge>}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                  disabled={creating || imageFiles.length >= 5}
                />
              </label>
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-neutral-100 cursor-pointer transition text-neutral-700 text-sm font-medium">
                <FileText size={18} className="text-primary-600" />
              <span className="hidden sm:inline">Tài liệu</span>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleDocumentChange}
                disabled={creating || uploadingDocs}
              />
            </label>
            {uploadingDocs && (
                <div className="flex items-center gap-2 text-xs text-neutral-500">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Đang tải...</span>
                </div>
            )}
          </div>
            <Button
            type="submit"
              variant="primary"
              size="md"
            disabled={!content.trim() || creating}
              loading={creating}
          >
            {creating ? 'Đang đăng...' : 'Đăng'}
            </Button>
        </div>
      </form>
      </Card>

      {/* Bộ lọc - Modern style */}
      <Card padding="md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-display font-bold text-neutral-900 flex items-center gap-2">
            <Home className="text-primary-600" size={22} /> Bảng tin học tập
        </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-neutral-100 text-neutral-700 text-sm font-medium">
              <FilterIcon size={16} />
            <span>Bộ lọc</span>
          </div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          >
            <option value="all">Tất cả môn</option>
            <option value="toan">Toán</option>
            <option value="ly">Lý</option>
            <option value="hoa">Hóa</option>
            <option value="sinh">Sinh</option>
            <option value="van">Văn</option>
            <option value="anh">Anh</option>
          </select>
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all"
          >
            <option value="all">Tất cả khối</option>
            <option value="10">Lớp 10</option>
            <option value="11">Lớp 11</option>
            <option value="12">Lớp 12</option>
          </select>
          <input
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            placeholder="#Tag (VD: logarit)"
              className="bg-white border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-900 w-32 sm:w-40 outline-none focus:ring-2 focus:ring-primary-500 transition-all placeholder:text-neutral-400"
          />
          {refreshing && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Loader2 size={14} className="animate-spin" />
                <span>Đang làm mới...</span>
              </div>
          )}
        </div>
      </div>
      </Card>

      {visiblePosts.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8 text-neutral-500">
            <EmptyState
              icon="search"
              title="Không có bài viết phù hợp"
              description={searchTerm ? "Thử tìm kiếm với từ khóa khác" : "Thử thay đổi bộ lọc hoặc tạo bài viết mới"}
            />
        </div>
        </Card>
      ) : (
        <>
          {visiblePosts.map((post) => (
            <Card key={post.id} className="overflow-hidden animate-fade-in" padding="none">
            {/* Header Modern */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-md">
                  {post.author_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[15px] text-neutral-900 leading-[1.5]">
                      {post.author_name}
                    </span>
                    {post.status === 'pending' && (
                      <Badge variant="warning" size="sm">
                        <span className="w-1.5 h-1.5 rounded-full bg-warning-500 animate-pulse mr-1" />
                        Đang phân tích
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {new Date(post.created_at).toLocaleString('vi-VN', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (editingPostId === post.id) {
                      cancelEditPost();
                    } else {
                      startEditPost(post);
                    }
                  }}
                  className="w-9 h-9 rounded-xl hover:bg-neutral-100 flex items-center justify-center text-neutral-600 shrink-0 transition-all hover:scale-110"
                  title="Sửa bài"
                >
                  <MoreHorizontal size={18} />
                </button>
              </div>

            {editingPostId === post.id ? (
                <div className="mt-4 space-y-3">
                <textarea
                  value={editingContent}
                  onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full min-h-[80px] max-h-40 resize-y border border-neutral-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-900"
                />
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                  <select
                    value={editingSubject}
                    onChange={(e) => setEditingSubject(e.target.value)}
                      className="bg-neutral-50 border border-neutral-300 rounded-lg px-3 py-1.5 text-sm text-neutral-700 outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="toan">Toán</option>
                    <option value="ly">Lý</option>
                    <option value="hoa">Hóa</option>
                    <option value="sinh">Sinh</option>
                    <option value="van">Văn</option>
                    <option value="anh">Anh</option>
                  </select>
                  <div className="flex items-center gap-2">
                      <Button
                      type="button"
                        variant="primary"
                        size="sm"
                      onClick={() => handleUpdatePost(post)}
                    >
                      Lưu
                      </Button>
                      <Button
                      type="button"
                        variant="error"
                        size="sm"
                      onClick={() => handleDeletePost(post)}
                    >
                        Xoá
                      </Button>
                      <Button
                      type="button"
                        variant="ghost"
                        size="sm"
                      onClick={cancelEditPost}
                    >
                      Hủy
                      </Button>
                  </div>
                </div>
              </div>
              ) : (
                <div className="mt-3">
                  <div className="text-[15px] text-neutral-900 leading-[1.6] break-words">
                    <MathText content={post.content} />
                  </div>
                {(post.subject || (post.aiTags && post.aiTags.length > 0)) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                    {post.subject && (
                        <Badge variant="primary" size="sm">
                        {post.subject}
                        {post.grade && ` · Lớp ${post.grade}`}
                        </Badge>
                    )}
                    {post.aiTags &&
                      post.aiTags.length > 0 &&
                      post.aiTags.map((tag) => (
                          <Badge key={tag} variant="neutral" size="sm">
                          {tag}
                          </Badge>
                      ))}
                  </div>
                )}
              </div>
            )}
            </div>

            {/* Image Gallery - Modern responsive */}
            {(post.image_urls && post.image_urls.length > 0) || post.image_url ? (
              <div className="px-4 pb-3">
                {post.image_urls && post.image_urls.length > 0 ? (
                  <div
                    className={`grid gap-2 rounded-xl overflow-hidden ${
                      post.image_urls.length === 1
                        ? 'grid-cols-1'
                        : post.image_urls.length === 2
                        ? 'grid-cols-2'
                        : post.image_urls.length === 3
                        ? 'grid-cols-2'
                        : 'grid-cols-2'
                    }`}
                  >
                    {post.image_urls.slice(0, 4).map((url, idx) => (
                      <div
                        key={idx}
                        className={`relative bg-neutral-100 overflow-hidden ${
                          post.image_urls!.length === 3 && idx === 0 ? 'row-span-2' : ''
                        }`}
                      >
                        <img
                          src={url}
                          alt={`Hình ${idx + 1}`}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300 cursor-pointer"
                          style={{
                            minHeight: post.image_urls!.length === 1 ? '400px' : '200px',
                            maxHeight: post.image_urls!.length === 1 ? '600px' : '300px',
                          }}
                        />
                      </div>
                    ))}
                    {post.image_urls.length > 4 && (
                      <div className="relative bg-neutral-100 overflow-hidden">
                        <img
                          src={post.image_urls[4]}
                          alt="Hình 5"
                          className="w-full h-full object-cover"
                          style={{ minHeight: '200px', maxHeight: '300px' }}
                        />
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center text-white font-bold text-2xl cursor-pointer hover:bg-black/70 transition-all">
                          +{post.image_urls.length - 4}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden bg-neutral-100">
                  <img
                    src={post.image_url}
                    alt="Hình minh họa"
                      className="w-full max-h-[600px] object-contain"
                  />
                  </div>
                )}
              </div>
            ) : null}

            {/* Hiển thị tài liệu - Modern style */}
            {post.attachments && post.attachments.length > 0 && (
              <div className="px-4 pb-3 space-y-2">
                {post.attachments.map((att, idx) => (
                  <a
                    key={idx}
                    href={`${(import.meta as any).env?.VITE_API_URL || 'http://35.223.145.48:8000'}${att.url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 hover:bg-neutral-100 hover:border-primary-300 transition-all group"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center shrink-0 group-hover:bg-primary-200 transition-colors">
                      <FileText size={20} className="text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-neutral-900 truncate">
                        {att.file_name}
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {(att.file_size / 1024).toFixed(0)} KB · {att.file_type.includes('pdf') ? 'PDF' : 'Word'}
                      </div>
                    </div>
                    <span className="text-sm text-primary-600 font-semibold group-hover:text-primary-700 transition-colors">Xem</span>
                  </a>
                ))}
              </div>
            )}

            {/* Action bar - Modern */}
            <div className="border-t border-neutral-200 px-4 py-2 relative bg-neutral-50/50">
              <div className="flex items-center justify-between text-neutral-600 text-sm">
                {/* Like button + Reactions dropdown */}
                <div className="flex items-center flex-1 relative">
                  <button
                    type="button"
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!currentUser?.uid) {
                        showToast('Vui lòng đăng nhập để thích bài viết', 'error');
                        return;
                      }
                      try {
                        await postsAPI.react(post.id, 'idea', currentUser.uid);
                        await reloadPost(post.id);
                      } catch (error: any) {
                        const errorMessage = handleAPIError(error);
                        showToast('Không thể cập nhật cảm xúc: ' + errorMessage, 'error');
                      }
                    }}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl hover:bg-neutral-100 text-neutral-700 transition-all font-medium group"
                  >
                    <ThumbsUp size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="hidden sm:inline">Thích</span>
                  </button>
                  
                  {/* Reactions dropdown button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowReactionsFor(showReactionsFor === post.id ? null : post.id);
                    }}
                    className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-neutral-100 transition-all hover:scale-110"
                    title="Cảm xúc khác"
                  >
                    <MoreHorizontal size={18} />
                  </button>
                  
                  {/* Reactions dropdown menu */}
                  {showReactionsFor === post.id && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReactionsFor(null);
                        }}
                      />
                      <div 
                        className="absolute left-0 bottom-full mb-2 bg-white rounded-2xl shadow-large border border-neutral-200 p-3 z-20 flex items-center gap-2 animate-scale-in"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {([
                          { key: 'idea', icon: '💡', label: 'Ý tưởng' },
                          { key: 'thinking', icon: '🤔', label: 'Suy nghĩ' },
                          { key: 'resource', icon: '📚', label: 'Tài liệu' },
                          { key: 'motivation', icon: '🔥', label: 'Động lực' },
                        ] as const).map((r) => {
                          const count = post.reactionCounts?.[r.key] ?? 0;
                          return (
                            <button
                              key={r.key}
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!currentUser?.uid) {
                                  showToast('Vui lòng đăng nhập để bày tỏ cảm xúc', 'error');
                                  return;
                                }
                                try {
                                  await postsAPI.react(post.id, r.key as "idea" | "thinking" | "resource" | "motivation", currentUser.uid);
                                  await reloadPost(post.id);
                                  setShowReactionsFor(null);
                                } catch (error: any) {
                                  const errorMessage = handleAPIError(error);
                                  showToast('Không thể cập nhật cảm xúc: ' + errorMessage, 'error');
                                }
                              }}
                              className="p-2 rounded-xl hover:bg-neutral-100 transition-all flex flex-col items-center gap-1 min-w-[70px] hover:scale-110"
                              title={r.label}
                            >
                              <span className="text-2xl">{r.icon}</span>
                              {count > 0 && (
                                <span className="text-xs text-neutral-600 font-medium">{count}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                
                {/* Comment button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const isExpanded = expandedComments[post.id];
                    if (!commentsByPost[post.id] && !isExpanded) {
                      void loadComments(post.id);
                    }
                    setExpandedComments((prev) => ({
                      ...prev,
                      [post.id]: !isExpanded,
                    }));
                  }}
                  className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl transition-all font-medium group ${
                    expandedComments[post.id] 
                      ? 'bg-primary-50 text-primary-600' 
                      : 'hover:bg-neutral-100 text-neutral-700'
                  }`}
                >
                  <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                  <span className="hidden sm:inline">
                    {typeof post.comments === 'number' ? post.comments : 0}
                  </span>
                </button>
                
                {/* Ask Anh Thơ button */}
                {onAskWithContext && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const ctxParts: string[] = [];
                      if (post.subject) ctxParts.push(`môn ${post.subject}`);
                      if (post.grade) ctxParts.push(`lớp ${post.grade}`);
                      const meta = ctxParts.length ? `Bài đăng ${ctxParts.join(', ')}` : 'Bài đăng';
                      const snippet = post.content.slice(0, 200);
                      const context = `${meta}: "${snippet}${post.content.length > 200 ? '...' : ''}"`;
                      onAskWithContext(context);
                    }}
                    className="hidden md:flex items-center justify-center gap-2 h-10 px-3 rounded-xl hover:bg-primary-50 text-primary-600 transition-all font-medium group"
                  >
                    <MessageCircle size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="text-sm">Hỏi Anh Thơ</span>
                  </button>
                )}
              </div>
            </div>

            {/* Bình luận gợi ý của Anh Thơ */}
            {post.aiComment && (
              <div className="px-4 pt-3 pb-3 border-t border-neutral-200 bg-gradient-to-r from-accent-50/50 to-primary-50/50 flex gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-600 to-primary-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                  AT
                </div>
                <div className="flex-1 bg-white rounded-xl px-4 py-3 border border-neutral-200">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-semibold text-xs text-neutral-700">Anh Thơ</span>
                    <Badge variant="primary" size="sm">AI</Badge>
                    <span className="text-xs text-neutral-500">Trợ lý học tập</span>
                  </div>
                  <div className="text-sm text-neutral-900 leading-relaxed">
                    <MathText content={post.aiComment} />
                  </div>
                </div>
              </div>
            )}

            {/* Danh sách bình luận & composer */}
            {expandedComments[post.id] && (
              <div className="px-4 pt-3 pb-4 border-t border-neutral-200 bg-neutral-50/30 space-y-3">
                {/* Comment composer */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-md">
                    HS
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={commentInput[post.id] || ''}
                    onChange={(e) =>
                      setCommentInput((prev) => ({ ...prev, [post.id]: e.target.value }))
                    }
                      placeholder="Viết bình luận..."
                      className="flex-1 text-sm px-4 py-2.5 rounded-2xl border-none bg-white outline-none focus:ring-2 focus:ring-primary-500 text-neutral-900 placeholder:text-neutral-500 shadow-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleCreateComment(post.id);
                      }
                    }}
                      disabled={creatingCommentFor === post.id}
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleCreateComment(post.id);
                    }}
                    className="p-2.5 rounded-xl bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 transition-all shrink-0 hover:scale-110 shadow-md"
                    disabled={!commentInput[post.id]?.trim() || creatingCommentFor === post.id}
                  >
                    {creatingCommentFor === post.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                  </div>
                </div>

                {/* Loading skeleton */}
                {loadingCommentsFor === post.id && !commentsByPost[post.id] && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-start gap-2 animate-pulse">
                        <div className="w-7 h-7 rounded-full bg-slate-200 shrink-0" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-slate-200 rounded w-1/4" />
                          <div className="h-8 bg-slate-200 rounded-lg w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Comments list */}
                {commentsByPost[post.id] && commentsByPost[post.id].length > 0 && (
                  <div className="space-y-3">
                  {commentsByPost[post.id].map((c) => (
                      <div key={c.id} className="flex items-start gap-3 animate-fade-in">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-md">
                        {c.author_name?.charAt(0) || 'U'}
                      </div>
                        <div className="flex-1 min-w-0">
                          {editingCommentId === c.id ? (
                            <div className="space-y-2">
                              <textarea
                                value={editingCommentContent}
                                onChange={(e) => setEditingCommentContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    e.stopPropagation();
                                    cancelEditComment();
                                  }
                                }}
                                className="w-full min-h-[60px] max-h-32 resize-y border border-primary-600 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white text-neutral-900"
                                autoFocus
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    void handleUpdateComment(post.id, c.id);
                                  }}
                                  disabled={updatingCommentFor === c.id || !editingCommentContent.trim()}
                                  className="px-3 py-1 rounded-md bg-primary-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1 hover:bg-primary-700 transition-colors"
                                >
                                  {updatingCommentFor === c.id ? (
                                    <>
                                      <Loader2 size={12} className="animate-spin" />
                                      Đang lưu...
                                    </>
                                  ) : (
                                    <>
                                      <Check size={12} />
                                      Lưu
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    cancelEditComment();
                                  }}
                                  disabled={updatingCommentFor === c.id}
                                  className="px-3 py-1 rounded-md border border-neutral-300 text-neutral-700 text-sm font-semibold disabled:opacity-50 hover:bg-neutral-50 transition-colors"
                                >
                                  Hủy
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-white rounded-xl px-4 py-3 border border-neutral-200 shadow-sm">
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-sm text-neutral-900">
                            {c.author_name}
                                  </span>
                                  {c.is_ai_generated && (
                                    <Badge variant="primary" size="sm">AI</Badge>
                                  )}
                                  <span className="text-xs text-neutral-500">
                                    {new Date(c.created_at).toLocaleString('vi-VN', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                    {c.updated_at !== c.created_at && ' (đã chỉnh sửa)'}
                                  </span>
                          </div>
                          {!c.is_ai_generated && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditComment(c);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-600 hover:text-primary-600 transition-all"
                                      title="Chỉnh sửa"
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        void handleDeleteComment(post.id, c);
                                      }}
                                      className="p-1.5 rounded-lg hover:bg-error-50 text-neutral-600 hover:text-error-600 transition-all"
                                      title="Xoá"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                          )}
                        </div>
                              <div className="text-sm text-neutral-900 leading-relaxed break-words">
                                <MathText content={c.content} />
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
                )}

                {/* Empty state */}
                {commentsByPost[post.id] && commentsByPost[post.id].length === 0 && (
                  <div className="text-center py-6 text-sm text-neutral-500">
                    <MessageCircle size={32} className="mx-auto mb-2 text-neutral-300" />
                    <p>Chưa có bình luận nào. Hãy là người đầu tiên bình luận!</p>
              </div>
            )}
          </div>
            )}
          </Card>
          ))}
        </>
      )}
      <div ref={loadMoreRef} className="h-12 flex items-center justify-center text-sm text-neutral-500">
        {loadingMore ? (
          <div className="flex items-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            <span>Đang tải thêm...</span>
          </div>
        ) : hasMore ? (
          'Kéo xuống để xem thêm bài viết'
        ) : (
          'Đã hiển thị hết các bài hiện có'
        )}
      </div>
    </div>
  );
};

export default StudentFeed;


