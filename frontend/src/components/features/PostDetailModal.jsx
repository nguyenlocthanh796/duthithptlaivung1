import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, appId as defaultAppId } from '../../services/firebase';
import { timeAgo } from '../../utils/helpers';
import CommentItem from './CommentItem';
import ImageWithFallback from '../ui/ImageWithFallback';
import { KatexRenderer } from '../ui';

const PostDetailModal = ({ post, user, appId: propAppId, onClose }) => {
  const appId = propAppId || defaultAppId;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Initialize like state
  useEffect(() => {
    const initialLiked = Array.isArray(post.likes) ? post.likes.includes(user?.uid) : false;
    const initialLikeCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
    setLiked(initialLiked);
    setLikeCount(initialLikeCount);
  }, [post.likes, user?.uid]);

  // Load comments real-time (always loaded in modal)
  useEffect(() => {
    if (!post.id || !db) return;

    const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const loadedComments = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || null
        }));
        setComments(loadedComments);
      },
      (error) => {
        console.error('❌ Error loading comments:', error);
      }
    );

    return () => unsubscribe();
  }, [post.id, appId, db]);

  // Toggle like với optimistic UI
  const toggleLike = async () => {
    if (!user || !post.id) return;

    const isLiking = !liked;
    setLiked(isLiking);
    setLikeCount(prev => isLiking ? prev + 1 : prev - 1);

    try {
      const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'posts', post.id);
      await updateDoc(postRef, {
        likes: isLiking ? arrayUnion(user.uid) : arrayRemove(user.uid)
      });
    } catch (error) {
      setLiked(!isLiking);
      setLikeCount(prev => isLiking ? prev - 1 : prev + 1);
      console.error("Lỗi like:", error);
    }
  };

  // Gửi comment
  const handleComment = async () => {
    if (!commentText.trim() || isSending || !user || !post.id) return;

    if (!db) {
      console.error('Firebase db not initialized');
      alert('Lỗi: Firebase chưa được khởi tạo');
      return;
    }

    const text = commentText;
    setCommentText('');
    setIsSending(true);

    try {
      const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts', post.id, 'comments');
      await addDoc(commentsRef, {
        text: text,
        author: {
          uid: user.uid,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL
        },
        createdAt: serverTimestamp(),
        likes: []
      });
    } catch (error) {
      console.error("❌ Lỗi comment:", error);
      setCommentText(text);
      alert(`Lỗi khi gửi bình luận: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && post.imageUrls && post.imageUrls.length > 1) {
        setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : post.imageUrls.length - 1));
      } else if (e.key === 'ArrowRight' && post.imageUrls && post.imageUrls.length > 1) {
        setCurrentImageIndex(prev => (prev < post.imageUrls.length - 1 ? prev + 1 : 0));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, post.imageUrls]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Filter valid image URLs
  const validImageUrls = post.imageUrls?.filter(url => url && typeof url === 'string') || [];
  const hasImages = validImageUrls.length > 0;
  const hasMultipleImages = hasImages && validImageUrls.length > 1;

  // Reset currentImageIndex nếu vượt quá số lượng ảnh hợp lệ
  useEffect(() => {
    if (currentImageIndex >= validImageUrls.length && validImageUrls.length > 0) {
      setCurrentImageIndex(0);
    }
  }, [validImageUrls.length, currentImageIndex]);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">Chi tiết bài viết</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Đóng"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Left: Images */}
          {hasImages && (
            <div className="relative bg-black lg:w-1/2 flex items-center justify-center min-h-[300px] lg:min-h-0 max-h-[50vh] lg:max-h-none">
              <ImageWithFallback
                src={validImageUrls[currentImageIndex]}
                alt={`Post image ${currentImageIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />

              {/* Navigation arrows */}
              {hasMultipleImages && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => prev > 0 ? prev - 1 : validImageUrls.length - 1);
                    }}
                    className="absolute left-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                    aria-label="Ảnh trước"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentImageIndex(prev => prev < validImageUrls.length - 1 ? prev + 1 : 0);
                    }}
                    className="absolute right-4 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                    aria-label="Ảnh sau"
                  >
                    <ChevronRight size={24} />
                  </button>
                </>
              )}

              {/* Image indicators */}
              {hasMultipleImages && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                  {validImageUrls.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentImageIndex(idx);
                      }}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
                      }`}
                      aria-label={`Ảnh ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Right: Post Content & Comments */}
          <div className={`flex-1 flex flex-col overflow-hidden ${hasImages ? 'lg:w-1/2' : 'w-full'}`}>
            {/* Post Header */}
            <div className="p-4 border-b border-gray-200 shrink-0">
              <div className="flex items-center gap-3 mb-3">
                {post.author?.photoURL ? (
                  <img
                    src={post.author.photoURL}
                    alt={post.author.displayName || 'User'}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                    <span className="font-bold text-gray-500">{post.author?.displayName?.[0] || 'U'}</span>
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{post.author?.displayName || 'Người dùng'}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{timeAgo(post.createdAt)}</span>
                    <span>•</span>
                    <span className="bg-gray-100 px-1.5 rounded">{post.subject || 'Chung'}</span>
                  </div>
                </div>
              </div>

              {/* Post Text */}
              {post.text && (
                <div className="text-gray-800 text-sm mb-3">
                  <KatexRenderer text={post.text} className="whitespace-pre-wrap" />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex gap-4">
                  <button
                    onClick={toggleLike}
                    className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                      liked ? 'text-red-500' : 'text-gray-600 hover:text-red-500'
                    }`}
                  >
                    <Heart size={20} fill={liked ? "currentColor" : "none"} />
                    <span>{likeCount > 0 && likeCount}</span>
                  </button>
                  <button className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-blue-500">
                    <MessageCircle size={20} />
                    <span>{comments.length > 0 && comments.length}</span>
                  </button>
                </div>
                <button className="text-gray-400 hover:text-gray-600">
                  <Share2 size={18} />
                </button>
              </div>
            </div>

            {/* Comments Section */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-8">
                  Chưa có bình luận nào. Hãy là người đầu tiên bình luận!
                </div>
              ) : (
                comments.map(cmt => (
                  <CommentItem
                    key={cmt.id}
                    comment={cmt}
                    postId={post.id}
                    user={user}
                    appId={appId}
                    depth={0}
                  />
                ))
              )}
            </div>

            {/* Comment Input */}
            <div className="p-4 border-t border-gray-200 shrink-0 bg-gray-50">
              <div className="flex gap-2 items-center">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User'}
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">
                    {user?.displayName?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="flex-1 relative">
                  <input
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleComment()}
                    placeholder="Viết bình luận công khai..."
                    className="w-full pl-4 pr-10 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-sm bg-white transition-all"
                    disabled={isSending}
                  />
                  <button
                    onClick={handleComment}
                    disabled={!commentText.trim() || isSending}
                    className={`absolute right-1 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-colors ${
                      commentText.trim() ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300'
                    }`}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailModal;

