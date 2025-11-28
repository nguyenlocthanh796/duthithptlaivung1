import React, { useState, useEffect } from 'react';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, appId as defaultAppId } from '../../services/firebase';
import { timeAgo } from '../../utils/helpers';
import { Heart, Reply, Send } from 'lucide-react';

const CommentItem = ({ comment, postId, user, appId, depth = 0 }) => {
  const [replies, setReplies] = useState([]);
  const [showReplies, setShowReplies] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [showReplyInput, setShowReplyInput] = useState(false);

  // Initialize like state và listen for real-time updates
  useEffect(() => {
    if (comment.likes && Array.isArray(comment.likes)) {
      const liked = comment.likes.includes(user?.uid);
      setIsLiked(liked);
      setLikeCount(comment.likes.length);
    } else {
      setIsLiked(false);
      setLikeCount(0);
    }
  }, [comment.likes, user?.uid]);

  // Real-time update cho likes (nếu comment object thay đổi từ parent)
  useEffect(() => {
    if (comment.likes && Array.isArray(comment.likes)) {
      const liked = comment.likes.includes(user?.uid);
      setIsLiked(liked);
      setLikeCount(comment.likes.length);
    }
  }, [comment]);

  // Load replies real-time
  useEffect(() => {
    if (!showReplies || !comment.id || !db || depth >= 2) return; // Max 2 levels deep

    const repliesRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts', postId, 'comments', comment.id, 'replies');
    const q = query(repliesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const loadedReplies = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt || null
        }));
        setReplies(loadedReplies);
      },
      (error) => {
        console.error('❌ Error loading replies:', error);
      }
    );

    return () => unsubscribe();
  }, [comment.id, showReplies, postId, appId, db, depth]);

  // Toggle like với optimistic UI
  const handleLike = async () => {
    if (!user || !comment.id || !db) return;

    const wasLiked = isLiked;
    const newLikeCount = wasLiked ? likeCount - 1 : likeCount + 1;

    // Optimistic update
    setIsLiked(!wasLiked);
    setLikeCount(newLikeCount);

    try {
      const commentRef = doc(db, 'artifacts', appId, 'public', 'data', 'posts', postId, 'comments', comment.id);
      await updateDoc(commentRef, {
        likes: wasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid)
      });
    } catch (error) {
      // Revert on error
      setIsLiked(wasLiked);
      setLikeCount(likeCount);
      console.error('❌ Error liking comment:', error);
    }
  };

  // Gửi reply
  const handleReply = async () => {
    if (!replyText.trim() || isSendingReply || !user || !comment.id) return;

    if (!db) {
      console.error('Firebase db not initialized');
      alert('Lỗi: Firebase chưa được khởi tạo');
      return;
    }

    const text = replyText;
    setReplyText('');
    setIsSendingReply(true);

    try {
      const repliesRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts', postId, 'comments', comment.id, 'replies');
      await addDoc(repliesRef, {
        text: text,
        author: {
          uid: user.uid,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL
        },
        createdAt: serverTimestamp(),
        likes: [] // Initialize likes array
      });

      // Auto show replies after sending
      if (!showReplies) {
        setShowReplies(true);
      }
    } catch (error) {
      console.error('❌ Error replying:', error);
      setReplyText(text); // Restore text on error
      alert(`Lỗi khi gửi phản hồi: ${error.message}`);
    } finally {
      setIsSendingReply(false);
    }
  };

  const maxDepth = 2; // Maximum nesting depth
  const canReply = depth < maxDepth;

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-2' : ''}`}>
      <div className="flex gap-2 items-start group">
        {/* Avatar */}
        {comment.author?.photoURL ? (
          <img 
            src={comment.author.photoURL} 
            alt={comment.author.displayName || 'User'} 
            className="w-8 h-8 rounded-full object-cover border border-gray-200 flex-shrink-0"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-xs font-bold text-blue-600 border border-blue-200">
            {comment.author?.displayName?.[0]?.toUpperCase() || 'U'}
          </div>
        )}

        {/* Comment Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white p-2.5 rounded-2xl rounded-tl-none border border-gray-200 shadow-sm inline-block max-w-full">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-bold text-xs text-gray-900">{comment.author?.displayName || 'User'}</span>
              {comment.author?.uid === user?.uid && (
                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                  Bạn
                </span>
              )}
            </div>
            <p className="text-sm text-gray-700 break-words">{comment.text || '(Không có nội dung)'}</p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 mt-1 ml-1 text-[10px] text-gray-400">
            <span>{timeAgo(comment.createdAt)}</span>
            
            {/* Like Button */}
            <button
              onClick={handleLike}
              className={`flex items-center gap-1 font-bold transition-all duration-200 ${
                isLiked 
                  ? 'text-red-500 hover:text-red-600' 
                  : 'text-gray-400 hover:text-red-500 hover:underline'
              }`}
            >
              <Heart 
                size={12} 
                fill={isLiked ? 'currentColor' : 'none'} 
                className={isLiked ? 'animate-pulse' : ''}
              />
              {likeCount > 0 && <span>{likeCount}</span>}
            </button>

            {/* Reply Button */}
            {canReply && (
              <button
                onClick={() => {
                  setShowReplyInput(!showReplyInput);
                  if (!showReplies && replies.length > 0) {
                    setShowReplies(true);
                  }
                }}
                className="flex items-center gap-1 font-bold hover:underline hover:text-blue-500 transition-colors"
              >
                <Reply size={12} />
                Phản hồi
              </button>
            )}

            {/* Show/Hide Replies */}
            {replies.length > 0 && (
              <button
                onClick={() => setShowReplies(!showReplies)}
                className="font-bold hover:underline hover:text-blue-500 transition-colors"
              >
                {showReplies ? 'Ẩn' : 'Hiện'} {replies.length} phản hồi
              </button>
            )}
          </div>

          {/* Reply Input */}
          {showReplyInput && canReply && (
            <div className="mt-2 flex gap-2 items-center">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName || 'User'} 
                  className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold text-xs">
                  {user?.displayName?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="flex-1 relative">
                <input
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                  placeholder="Viết phản hồi..."
                  className="w-full pl-3 pr-8 py-1.5 rounded-full border border-gray-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-xs bg-white transition-all"
                  disabled={isSendingReply}
                />
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || isSendingReply}
                  className={`absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full transition-colors ${
                    replyText.trim() ? 'text-blue-600 hover:bg-blue-50' : 'text-gray-300'
                  }`}
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Replies List */}
          {showReplies && replies.length > 0 && (
            <div className="mt-2 space-y-2">
              {replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  user={user}
                  appId={appId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;

