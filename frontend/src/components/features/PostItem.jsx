import React, { useState, useEffect } from 'react';
import { MessageCircle, Send, Heart, MoreHorizontal, Image as ImageIcon, BookOpen, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db, appId as defaultAppId } from '../../services/firebase';
import { timeAgo } from '../../utils/helpers';
import CommentItem from './CommentItem';
import PostDetailModal from './PostDetailModal';
import ImageWithFallback from '../ui/ImageWithFallback';
import { KatexRenderer } from '../ui';
import { callGeminiAI } from '../../services/geminiService';

const PostItem = ({ post, user, appId: propAppId }) => {
  // Sử dụng appId từ props hoặc default
  const appId = propAppId || defaultAppId;
  // Kiểm tra xem user hiện tại đã like chưa
  // post.likes có thể là array hoặc number (backward compatibility)
  const initialLiked = Array.isArray(post.likes) 
    ? post.likes.includes(user?.uid) 
    : false;
  const initialLikeCount = Array.isArray(post.likes) 
    ? post.likes.length 
    : (post.likes || 0);
  
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isSolving, setIsSolving] = useState(false);
  const [solveResult, setSolveResult] = useState(null);
  const [solveError, setSolveError] = useState(null);

  // 1. Lắng nghe Comment Real-time (Chỉ khi mở phần bình luận để tiết kiệm tài nguyên)
  useEffect(() => {
    if (!showComments || !post.id) {
      // Reset comments khi đóng phần bình luận
      if (!showComments) {
        setComments([]);
      }
      return;
    }
    
    if (!db) {
      console.error('❌ Firestore db not available. Cannot load comments.');
      return;
    }
    
    console.log('📥 Loading comments for post:', {
      postId: post.id,
      appId,
      path: `artifacts/${appId}/public/data/posts/${post.id}/comments`
    });
    
    // Query vào sub-collection 'comments' của bài post
    const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts', post.id, 'comments');
    const q = query(commentsRef, orderBy('createdAt', 'asc'));
    
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loadedComments = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
            id: doc.id, 
            ...data,
            // Đảm bảo createdAt được xử lý đúng
            createdAt: data.createdAt || null
          };
        });
        console.log(`✅ Comments loaded for post ${post.id}:`, loadedComments.length, 'comments');
        if (loadedComments.length > 0) {
          console.log('📝 Comments:', loadedComments.map(c => ({ id: c.id, text: c.text, author: c.author?.displayName })));
        }
        setComments(loadedComments);
      }, 
      (error) => {
        console.error('❌ Error loading comments:', error);
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          appId,
          postId: post.id
        });
        // Không set empty array để giữ comments cũ nếu có
      }
    );
    
    return () => {
      console.log(`🔌 Unsubscribing comments for post ${post.id}`);
      unsubscribe();
    };
  }, [post.id, showComments, appId, db]);

  // 2. Xử lý Like
  const toggleLike = async () => {
    if (!user || !post.id) return;
    
    const isLiking = !liked;
    
    // Cập nhật UI ngay lập tức (Optimistic Update)
    setLiked(isLiking);
    setLikeCount(prev => isLiking ? prev + 1 : prev - 1);
    
    try {
      const postRef = doc(db, 'artifacts', appId, 'public', 'data', 'posts', post.id);
      await updateDoc(postRef, {
        // Dùng arrayUnion/Remove để tránh lỗi khi nhiều người like cùng lúc
        likes: isLiking ? arrayUnion(user.uid) : arrayRemove(user.uid)
      });
    } catch (error) {
      // Revert nếu lỗi
      setLiked(!isLiking);
      setLikeCount(prev => isLiking ? prev - 1 : prev + 1);
      console.error("Lỗi like:", error);
    }
  };

  // 3. Xử lý Gửi Comment
  const handleComment = async () => {
    if (!commentText.trim() || isSending || !user || !post.id) {
      console.warn('Cannot comment:', { hasText: !!commentText.trim(), isSending, hasUser: !!user, hasPostId: !!post.id });
      return;
    }
    
    if (!db) {
      console.error('Firebase db not initialized');
      alert('Lỗi: Firebase chưa được khởi tạo');
      return;
    }
    
    const text = commentText;
    setCommentText(''); // Xóa ô nhập ngay
    setIsSending(true);
    
    try {
      const commentsRef = collection(db, 'artifacts', appId, 'public', 'data', 'posts', post.id, 'comments');
      console.log('Creating comment:', {
        path: `artifacts/${appId}/public/data/posts/${post.id}/comments`,
        appId,
        postId: post.id,
        user: user.uid
      });
      
      const docRef = await addDoc(commentsRef, {
        text: text,
        author: {
          uid: user.uid,
          displayName: user.displayName || 'User',
          photoURL: user.photoURL
        },
        createdAt: serverTimestamp(),
        likes: [] // Initialize likes array for comments
      });
      
      console.log('✅ Comment created successfully:', docRef.id);
    } catch (error) {
      console.error("❌ Lỗi comment:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        appId,
        postId: post.id,
        path: `artifacts/${appId}/public/data/posts/${post.id}/comments`
      });
      setCommentText(text); // Trả lại text nếu lỗi
      alert(`Lỗi khi gửi bình luận: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  // Tính toán grid layout cho ảnh
  const getImageGridClass = (total, index) => {
    if (total === 1) return 'grid-cols-1';
    if (total === 2) return 'grid-cols-2';
    if (total === 3) {
      if (index === 0) return 'col-span-2 row-span-2';
      return 'col-span-1';
    }
    if (total === 4) return 'grid-cols-2';
    return 'grid-cols-2';
  };

  // Giải bài tập từ nội dung bài viết
  const handleSolveExercise = async () => {
    if (!user || !post) return;
    
    // Nếu đã có kết quả, không làm gì cả (đã lưu vào database, không hiển thị)
    if (solveResult) {
      return; // Không hiển thị gì cả
    }

    setIsSolving(true);
    setSolveError(null);
    setSolveResult(null);

    try {
      // Lấy nội dung text của post
      const postText = post.text || '';
      
      // Lấy ảnh đầu tiên từ post (nếu có)
      let imageBase64 = null;
      if (post.imageUrls && post.imageUrls.length > 0) {
        try {
          // Convert image URL to base64
          const imageUrl = post.imageUrls[0];
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          
          // Convert blob to base64
          imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (imgError) {
          console.warn('Không thể tải ảnh:', imgError);
          // Tiếp tục mà không có ảnh
        }
      }

      // Tạo prompt để giải bài tập - NGẮN GỌN, PHÙ HỢP HỌC SINH KHÁ GIỎI
      const prompt = `Bạn là Anh Thơ, một người bạn học cùng lớp rất hòa đồng, kiến thức sâu rộng và thông thái.

QUAN TRỌNG - KIỂM TRA NỘI DUNG:
- CHỈ giải bài tập nếu nội dung hoặc hình ảnh liên quan đến HỌC TẬP (Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, Anh, hoặc các môn học THPT)
- Nếu nội dung KHÔNG liên quan đến học tập, hãy trả lời: "Nội dung này không phải là bài tập học tập. Vui lòng chọn bài viết chứa bài tập Toán, Lý, Hóa, Sinh, Văn, Sử, Địa, hoặc Tiếng Anh."

YÊU CẦU KHI GIẢI BÀI TẬP (QUAN TRỌNG - PHẢI TUÂN THỦ):
- TRẢ LỜI NGẮN GỌN NHẤT CÓ THỂ - phù hợp với học sinh khá giỏi (không cần giải thích quá chi tiết)
- Chỉ giải các bước chính, bỏ qua các bước trung gian không cần thiết
- Sử dụng LaTeX cho công thức: $x^2$, $\\frac{a}{b}$, $$E = mc^2$$
- CHỈ dùng **bold** cho các thuật ngữ quan trọng như **hàm số**, **đạo hàm**
- CUỐI CÙNG PHẢI CÓ KẾT LUẬN IN ĐẬM: **Kết luận: [đáp án cuối cùng]**
- Viết bằng tiếng Việt, tự nhiên, súc tích
- Không dài dòng, không lặp lại thông tin

Nội dung bài viết:
${postText ? `"${postText}"` : '(Không có nội dung text)'}

${imageBase64 ? 'Có kèm theo hình ảnh bài tập.' : 'Không có hình ảnh.'}

Hãy phân tích và giải bài tập NGẮN GỌN (nếu là bài tập học tập), kết thúc bằng **Kết luận: [đáp án]**:`;

      const response = await callGeminiAI(prompt, imageBase64);

      // Kiểm tra nếu response là lỗi
      if (!response || typeof response !== 'string' || response.includes('Lỗi') || response.includes('Vui lòng')) {
        setSolveError(response || 'Lỗi khi kết nối với AI. Vui lòng thử lại sau.');
        setIsSolving(false);
        return;
      }

      // Kiểm tra nếu không liên quan học tập
      if (response.includes('không phải là bài tập') || 
          response.includes('không liên quan đến học tập') ||
          response.includes('không phải bài tập học tập') ||
          response.includes('Nội dung này không phải')) {
        setSolveError(response);
        setIsSolving(false);
        return;
      }

      // Lưu kết quả vào Firestore trước khi set state
      if (db) {
        try {
          const solveResultRef = collection(db, 'artifacts', appId, 'public', 'data', 'solvedExercises');
          
          await addDoc(solveResultRef, {
            userId: user.uid,
            author: {
              uid: user.uid,
              displayName: user.displayName || 'User',
              photoURL: user.photoURL
            },
            postId: post.id,
            postText: postText,
            imageUrls: post.imageUrls || [],
            solution: response,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          // Chỉ set state sau khi lưu thành công
          setSolveResult(response);
        } catch (saveError) {
          // Chỉ log lỗi nếu không phải lỗi permissions hoặc blocked by client
          const isPermissionError = saveError.code === 'permission-denied' || saveError.code === 'PERMISSION_DENIED';
          const isBlockedError = saveError.message?.includes('ERR_BLOCKED_BY_CLIENT') || 
                                saveError.message?.includes('blocked') ||
                                saveError.code === 'cancelled';
          
          if (!isPermissionError && !isBlockedError) {
            // Silent fail - không log để tránh spam console
          }
          // Vẫn set state để đánh dấu đã giải (nhưng không lưu được)
          setSolveResult(response);
        }
      } else {
        // Nếu không có db, vẫn set state
        setSolveResult(response);
      }
    } catch (error) {
      console.error('Error solving exercise:', error);
      
      // Xử lý lỗi cụ thể
      let errorMessage = 'Lỗi khi xử lý bài tập. Vui lòng thử lại.';
      
      if (error.message?.includes('500') || error.message?.includes('Internal Server Error')) {
        errorMessage = 'Backend đang gặp sự cố. Vui lòng thử lại sau hoặc kiểm tra kết nối mạng.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorMessage = 'Lỗi kết nối mạng. Vui lòng kiểm tra kết nối internet và thử lại.';
      }
      
      setSolveError(errorMessage);
    } finally {
      setIsSolving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm mb-4 overflow-hidden">
      <div className="p-4 pb-2">
        {/* Header: Avatar & Tên */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden">
                {post.author?.photoURL ? (
                  <img src={post.author.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-gray-500">{post.author?.displayName?.[0] || 'U'}</span>
                )}
             </div>
             <div>
                <h4 className="font-bold text-gray-900 text-sm">{post.author?.displayName || 'Người dùng'}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{timeAgo(post.createdAt)}</span>
                  <span>•</span>
                  <span className="bg-gray-100 px-1.5 rounded">{post.subject || 'Chung'}</span>
                </div>
             </div>
          </div>
          <button className="text-gray-400 hover:bg-gray-100 p-1 rounded-full"><MoreHorizontal size={20}/></button>
        </div>
        
        {/* Nội dung bài viết */}
        <div className="mt-3 text-gray-800 text-sm">
          <KatexRenderer text={post.text || ''} className="whitespace-pre-wrap" />
        </div>
      </div>

      {/* Grid Ảnh thông minh */}
      {post.imageUrls && post.imageUrls.length > 0 && (
        <div className={`mt-1 grid gap-0.5 ${getImageGridClass(post.imageUrls.length, 0)}`}>
           {post.imageUrls
             .filter(url => url && typeof url === 'string') // Filter out invalid URLs
             .map((url, idx) => (
              <div 
                key={idx} 
                className={`relative bg-gray-100 overflow-hidden cursor-pointer group ${
                  post.imageUrls.length === 3 && idx === 0 ? 'row-span-2' : ''
                } aspect-square`}
                onClick={() => setShowModal(true)}
              >
                 <ImageWithFallback
                   src={url}
                   alt={`Post content ${idx + 1}`}
                   className="w-full h-full object-cover hover:brightness-95 transition-all group-hover:scale-105"
                 />
                 {/* Overlay hint */}
                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                   <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full">
                     Click để xem chi tiết
                   </span>
                 </div>
              </div>
           ))}
        </div>
      )}

      {/* Thống kê Like/Comment */}
      <div className="px-4 py-2 flex justify-between text-xs text-gray-500 border-b border-gray-100">
         <div className="flex items-center gap-1">
            {likeCount > 0 && (
              <>
                <div className="bg-blue-500 p-1 rounded-full"><Heart size={8} fill="white" className="text-white"/></div>
                <span>{likeCount} lượt thích</span>
              </>
            )}
         </div>
         <button onClick={() => setShowComments(!showComments)} className="hover:underline">
            {comments.length > 0 ? `${comments.length} bình luận` : 'Bình luận'}
         </button>
      </div>

      {/* Nút hành động */}
      <div className="px-2 py-1 flex items-center justify-between">
         <button 
           onClick={toggleLike} 
           className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
             liked ? 'text-red-500' : 'text-gray-600 hover:bg-gray-50'
           }`}
         >
            <Heart size={18} fill={liked ? "currentColor" : "none"}/> Thích
         </button>
         <button 
           onClick={() => setShowComments(!showComments)} 
           className="flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
         >
            <MessageCircle size={18}/> Bình luận
         </button>
         <button 
           onClick={handleSolveExercise}
           disabled={isSolving}
           className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
             isSolving 
               ? 'text-gray-400 cursor-not-allowed' 
               : solveResult
                 ? 'text-purple-600 hover:bg-purple-50'
                 : 'text-gray-600 hover:bg-gray-50'
           }`}
         >
            {isSolving ? (
              <>
                <Loader2 size={18} className="animate-spin"/>
                Đang giải...
              </>
            ) : solveResult ? (
              <>
                <CheckCircle size={18}/> Đáp án
              </>
            ) : (
              <>
                <BookOpen size={18}/> Giải bài tập
              </>
            )}
         </button>
      </div>

      {/* Khu vực Bình luận */}
      {showComments && (
        <div className="bg-gray-50 p-3 border-t border-gray-100">
           {/* Danh sách bình luận */}
           <div className="space-y-3 mb-4 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {comments.length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-4">Chưa có bình luận nào</div>
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

           {/* Ô nhập bình luận */}
           <div className="flex gap-2 items-center">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 flex items-center justify-center text-gray-500 font-bold">
                 {user?.displayName?.[0] || 'U'}
              </div>
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
      )}


      {/* Error Display - Inline */}
      {solveError && !isSolving && (
        <div className="border-t border-gray-200 bg-red-50/50">
          <div className="p-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
              <div className="flex-1">
                <p className="text-red-800 font-medium text-sm mb-1">Không thể giải bài tập</p>
                <p className="text-red-600 text-xs">{solveError}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Post Detail Modal */}
      {showModal && (
        <PostDetailModal
          post={post}
          user={user}
          appId={appId}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
};

export default PostItem;

