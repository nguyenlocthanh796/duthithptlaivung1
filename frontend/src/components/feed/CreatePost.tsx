/**
 * Component tạo Post mới
 * Ví dụ cách sử dụng API với authentication
 * ĐÃ TÍCH HỢP: Nén ảnh WebP trên trình duyệt trước khi upload
 */
import React, { useState, ChangeEvent } from 'react';
import imageCompression from 'browser-image-compression';
import { postsAPI, PostCreate } from '../../services/api';

const CreatePost: React.FC = () => {
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('toan');
  const [postType, setPostType] = useState('text');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [imageInfo, setImageInfo] = useState<string | null>(null);

  const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setImageInfo('Đang nén ảnh...');

      // Tuỳ chọn nén: Max width 1280px, chất lượng ~60%, đổi sang WebP
      const options = {
        maxWidthOrHeight: 1280,
        initialQuality: 0.6,
        fileType: 'image/webp',
        useWebWorker: true,
      } as const;

      const compressed = await imageCompression(file, options);

      setImageFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));

      const originalKb = (file.size / 1024).toFixed(0);
      const compressedKb = (compressed.size / 1024).toFixed(0);
      setImageInfo(`Ảnh đã nén: ${originalKb}KB → ${compressedKb}KB (${compressed.type})`);
      setPostType('image');
    } catch (err: any) {
      console.error('Error compressing image:', err);
      setError('Không thể nén ảnh, vui lòng thử lại với file khác');
      setImageFile(null);
      setPreviewUrl(null);
      setImageInfo(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Vui lòng nhập nội dung bài viết');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Nếu có ảnh, upload lên storage riêng hoặc encode base64 (tuỳ backend).
      // Ở đây demo: convert sang base64 để gửi trong field image_url (phù hợp backend thử nghiệm).
      let imageUrl: string | undefined;
      if (imageFile) {
        const base64 = await imageCompression.getDataUrlFromFile(imageFile);
        imageUrl = base64;
      }

      // Tạo post data
      const postData: PostCreate = {
        content: content.trim(),
        subject: subject,
        post_type: postType,
        image_url: imageUrl,
        // author_id, author_name, author_email sẽ tự động lấy từ Firebase token
      };

      // Gọi API - cần authentication (token tự động được gửi)
      const newPost = await postsAPI.create(postData);
      
      console.log('Post created:', newPost);
      
      // Reset form
      setContent('');
      setImageFile(null);
      setPreviewUrl(null);
      setImageInfo(null);
      setSuccess(true);
      
      // Có thể trigger reload danh sách posts ở component cha
      // hoặc emit event để component khác reload
      
    } catch (err: any) {
      setError(err.message || 'Không thể tạo bài viết');
      console.error('Error creating post:', err);
      
      // Nếu lỗi 401, có thể user chưa đăng nhập
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        setError('Vui lòng đăng nhập để tạo bài viết');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #ddd', padding: '20px', margin: '20px 0' }}>
      <h2>Tạo Bài viết Mới</h2>
      
      {success && (
        <div style={{ color: 'green', marginBottom: '10px' }}>
          ✅ Tạo bài viết thành công!
        </div>
      )}
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px' }}>
          ❌ {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '15px' }}>
          <label>Nội dung: </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            style={{ width: '100%', padding: '8px' }}
            placeholder="Nhập nội dung bài viết..."
            disabled={loading}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Môn học: </label>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={loading}
          >
            <option value="toan">Toán</option>
            <option value="ly">Lý</option>
            <option value="hoa">Hóa</option>
            <option value="van">Văn</option>
            <option value="anh">Anh</option>
          </select>
        </div>

        <div style={{ marginBottom: '15px' }}>
          <label>Loại bài viết: </label>
          <select
            value={postType}
            onChange={(e) => setPostType(e.target.value)}
            disabled={loading}
          >
            <option value="text">Văn bản</option>
            <option value="image">Hình ảnh</option>
            <option value="question">Câu hỏi</option>
          </select>
        </div>

        {/* Chọn ảnh (tự nén WebP trên browser trước khi upload) */}
        <div style={{ marginBottom: '15px' }}>
          <label>Ảnh minh họa (tùy chọn, sẽ được nén WebP): </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            disabled={loading}
          />
          {imageInfo && (
            <div style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>
              {imageInfo}
            </div>
          )}
          {previewUrl && (
            <div style={{ marginTop: '10px' }}>
              <img
                src={previewUrl}
                alt="Xem trước"
                style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '8px', border: '1px solid #ddd' }}
              />
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={loading || !content.trim()}
          style={{ padding: '10px 20px', fontSize: '16px' }}
        >
          {loading ? 'Đang tạo...' : 'Tạo Bài viết'}
        </button>
      </form>
    </div>
  );
};

export default CreatePost;

