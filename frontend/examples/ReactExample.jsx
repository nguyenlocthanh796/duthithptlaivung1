/**
 * Ví dụ sử dụng API trong React Component
 */
import React, { useState, useEffect } from 'react';
import { postsAPI, examsAPI } from '../api';

function PostsList() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await postsAPI.getAll({ subject: 'toan', limit: 20 });
      setPosts(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    try {
      const newPost = await postsAPI.create({
        content: "Bài viết mới từ React",
        subject: "toan",
        post_type: "text",
      });
      // Reload posts sau khi tạo
      await loadPosts();
      alert('Tạo post thành công!');
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  const handleLike = async (postId) => {
    try {
      await postsAPI.like(postId);
      // Reload posts để cập nhật số like
      await loadPosts();
    } catch (err) {
      alert('Lỗi: ' + err.message);
    }
  };

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div>Lỗi: {error}</div>;

  return (
    <div>
      <button onClick={handleCreatePost}>Tạo Post Mới</button>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <p>{post.content}</p>
            <p>Likes: {post.likes}</p>
            <button onClick={() => handleLike(post.id)}>Like</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PostsList;

