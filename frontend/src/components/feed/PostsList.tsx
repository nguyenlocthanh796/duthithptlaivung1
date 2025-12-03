/**
 * Component hiển thị danh sách Posts
 * Ví dụ cách import và sử dụng API service
 */
import React, { useState, useEffect } from 'react';
import { postsAPI, Post } from '../../services/api';

const PostsList: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string>('all');

  // Load posts khi component mount hoặc subject thay đổi
  useEffect(() => {
    loadPosts();
  }, [selectedSubject]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Gọi API - không cần authentication để xem posts
      const filters: any = { limit: 50 };
      if (selectedSubject !== 'all') {
        filters.subject = selectedSubject;
      }
      
      const data = await postsAPI.getAll(filters);
      setPosts(data);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách bài viết');
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string) => {
    try {
      // Gọi API like - cần authentication (token tự động được gửi)
      await postsAPI.like(postId);
      // Reload để cập nhật số like
      await loadPosts();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
      console.error('Error liking post:', err);
    }
  };

  const handleReact = async (
    postId: string,
    reaction: 'idea' | 'thinking' | 'resource' | 'motivation'
  ) => {
    try {
      // Gọi API react - cần authentication
      await postsAPI.react(postId, reaction);
      await loadPosts();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
      console.error('Error reacting to post:', err);
    }
  };

  if (loading) {
    return <div>Đang tải bài viết...</div>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: 'red' }}>Lỗi: {error}</p>
        <button onClick={loadPosts}>Thử lại</button>
      </div>
    );
  }

  return (
    <div>
      <h2>Danh sách Bài viết</h2>
      
      {/* Filter theo subject */}
      <div>
        <label>Môn học: </label>
        <select 
          value={selectedSubject} 
          onChange={(e) => setSelectedSubject(e.target.value)}
        >
          <option value="all">Tất cả</option>
          <option value="toan">Toán</option>
          <option value="ly">Lý</option>
          <option value="hoa">Hóa</option>
          <option value="van">Văn</option>
        </select>
      </div>

      {/* Danh sách posts */}
      <div>
        {posts.length === 0 ? (
          <p>Chưa có bài viết nào</p>
        ) : (
          posts.map((post) => (
            <div key={post.id} style={{ border: '1px solid #ccc', padding: '10px', margin: '10px 0' }}>
              <h3>{post.content}</h3>
              <p>
                <strong>Tác giả:</strong> {post.author_name} ({post.author_role})
              </p>
              {post.subject && (
                <p><strong>Môn:</strong> {post.subject}</p>
              )}
              <p>
                <strong>Likes:</strong> {post.likes} | 
                <strong> Comments:</strong> {post.comments} | 
                <strong> Shares:</strong> {post.shares}
              </p>
              <p><small>{new Date(post.created_at).toLocaleString('vi-VN')}</small></p>
              
              {/* Buttons */}
              <div>
                <button onClick={() => handleLike(post.id)}>👍 Like ({post.likes})</button>
                <button onClick={() => handleReact(post.id, 'idea')}>💡 Hiểu rồi</button>
                <button onClick={() => handleReact(post.id, 'motivation')}>🔥 Cố lên</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PostsList;

