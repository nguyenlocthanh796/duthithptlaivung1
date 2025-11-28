import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { uploadMultipleImages } from '../services/storageService';
import { Button } from '../components/ui';
import { compressImage } from '../utils/helpers';
import PostItem from '../components/features/PostItem';
import { Image as ImageIcon, Send, Camera, X } from 'lucide-react';

const FeedPage = ({ user, appId: propAppId }) => {
  const [postText, setPostText] = useState('');
  const [posts, setPosts] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const filters = ['Tất cả', 'Đại số 12', 'Hình học', 'Vật lý', 'Tiếng Anh'];
  const [selectedFilter, setSelectedFilter] = useState('Tất cả');
  
  // Sử dụng appId từ props hoặc từ firebase service
  const currentAppId = propAppId || appId;

  useEffect(() => {
    if (!user) {
      return;
    }
    
    if (!db) {
      return;
    }

    const q = query(
      collection(db, 'artifacts', currentAppId, 'public', 'data', 'posts'), 
      orderBy('createdAt', 'desc'), 
      limit(20)
    );
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const loadedPosts = snapshot.docs.map(doc => {
          const postData = doc.data();
          // Filter out invalid blob URLs từ imageUrls
          if (postData.imageUrls && Array.isArray(postData.imageUrls)) {
            postData.imageUrls = postData.imageUrls.filter(url => {
              // Giữ lại Firebase Storage URLs và valid URLs
              // Loại bỏ blob URLs (chúng sẽ hết hạn sau reload)
              if (!url || typeof url !== 'string') return false;
              // Giữ Firebase Storage URLs, HTTP/HTTPS URLs
              if (url.startsWith('https://') || url.startsWith('http://')) return true;
              // Loại bỏ blob URLs
              if (url.startsWith('blob:')) return false;
              return true;
            });
          }
          return { id: doc.id, ...postData };
        });
        setPosts(loadedPosts);
      }, 
      (error) => {
        // Error loading posts
      }
    );
    return () => unsubscribe();
  }, [currentAppId, user, db]);

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    
    try {
      // Nén tất cả ảnh
      const compressedFiles = await Promise.all(
        files.map(file => compressImage(file, 1920, 1920, 0.85, 1))
      );
      
      // Tạo preview từ file đã nén
      const newPreviews = compressedFiles.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setImageFiles(prev => [...prev, ...compressedFiles]);
    } catch (error) {
      // Fallback: sử dụng file gốc nếu nén thất bại
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setImagePreviews(prev => [...prev, ...newPreviews]);
      setImageFiles(prev => [...prev, ...files]);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePostSubmit = async () => {
    if (!postText.trim() && !imagePreviews.length) return;
    if (!user) {
      return;
    }
    
    if (!db) {
      alert('Lỗi: Firebase chưa được khởi tạo');
      return;
    }
    
    setIsUploading(true);
    
    try {
      // Upload ảnh lên Firebase Storage trước
      let imageUrls = [];
      if (imageFiles.length > 0) {
        try {
          imageUrls = await uploadMultipleImages(imageFiles, user.uid, currentAppId);
        } catch (uploadError) {
          // Vẫn tạo post nhưng không có ảnh
          alert('Lỗi khi upload ảnh. Bài viết sẽ được đăng không có ảnh.');
        }
      }
      
      // Revoke blob URLs để giải phóng memory
      imagePreviews.forEach(url => URL.revokeObjectURL(url));
      
      const postData = {
        text: postText,
        imageUrls: imageUrls, // URLs từ Firebase Storage
        author: { 
          uid: user.uid, 
          displayName: user.displayName || user.email || 'User',
          photoURL: user.photoURL
        },
        createdAt: serverTimestamp(),
        subject: selectedFilter === 'Tất cả' ? 'Chung' : selectedFilter,
        likes: [] // Mảng UIDs của người đã like
      };
      
      await addDoc(collection(db, 'artifacts', currentAppId, 'public', 'data', 'posts'), postData);
      
      setPostText('');
      setImagePreviews([]);
      setImageFiles([]);
    } catch(e) { 
      alert("Lỗi đăng bài: " + e.message); 
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index) => {
    // Revoke object URL để giải phóng memory
    URL.revokeObjectURL(imagePreviews[index]);
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
    setImageFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
       <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex gap-3">
             <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold shrink-0">
               {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
             </div>
             <div className="flex-1">
                <textarea 
                  className="w-full resize-none border-none outline-none text-gray-700 text-sm min-h-[60px]" 
                  placeholder="Bạn đang nghĩ gì?" 
                  value={postText} 
                  onChange={e=>setPostText(e.target.value)}
                  disabled={isUploading}
                />
                {imagePreviews.length > 0 && (
                   <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                     {imagePreviews.map((url, i) => (
                       <div key={i} className="relative w-20 h-20 shrink-0">
                         <img src={url} className="w-full h-full object-cover rounded-lg" alt={`Preview ${i + 1}`} />
                         <button 
                           onClick={()=>removeImage(i)} 
                           className="absolute top-0 right-0 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70 transition-colors"
                           disabled={isUploading}
                         >
                           <X size={12}/>
                         </button>
                       </div>
                     ))}
                   </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                   <div className="flex gap-1">
                      <label className="p-2 text-gray-500 hover:bg-gray-100 rounded-full cursor-pointer transition-colors">
                        <ImageIcon size={20}/>
                        <input 
                          type="file" 
                          multiple 
                          accept="image/*"
                          className="hidden" 
                          onChange={handleImageSelect}
                          disabled={isUploading}
                        />
                      </label>
                      <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors" disabled={isUploading}>
                        <Camera size={20}/>
                      </button>
                   </div>
                   <Button 
                     size="sm" 
                     onClick={handlePostSubmit}
                     disabled={isUploading || (!postText.trim() && !imagePreviews.length)}
                   >
                     {isUploading ? 'Đang đăng...' : 'Đăng bài'} 
                     {!isUploading && <Send size={14}/>}
                   </Button>
                </div>
             </div>
          </div>
       </div>
       
       <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
         {filters.map(f => (
           <button 
             key={f} 
             onClick={()=>setSelectedFilter(f)} 
             className={`px-4 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap transition-colors ${
               selectedFilter===f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
             }`}
           >
             {f}
           </button>
         ))}
       </div>
       
       <div>
         {posts.length === 0 ? (
           <div className="text-center text-gray-400 py-8">
             Chưa có bài viết nào. Hãy là người đầu tiên đăng bài!
           </div>
         ) : (
           posts.map(post => (
             <PostItem key={post.id} post={post} user={user} appId={currentAppId} />
           ))
         )}
       </div>
    </div>
  );
};

export default FeedPage;
