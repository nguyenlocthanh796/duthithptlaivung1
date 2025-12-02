<template>
  <div>
    <button @click="createPost">Tạo Post Mới</button>
    <div v-if="loading">Đang tải...</div>
    <div v-if="error">Lỗi: {{ error }}</div>
    <ul v-else>
      <li v-for="post in posts" :key="post.id">
        <p>{{ post.content }}</p>
        <p>Likes: {{ post.likes }}</p>
        <button @click="likePost(post.id)">Like</button>
      </li>
    </ul>
  </div>
</template>

<script>
import { postsAPI } from '../api';

export default {
  name: 'PostsList',
  data() {
    return {
      posts: [],
      loading: true,
      error: null,
    };
  },
  async mounted() {
    await this.loadPosts();
  },
  methods: {
    async loadPosts() {
      try {
        this.loading = true;
        this.posts = await postsAPI.getAll({ subject: 'toan', limit: 20 });
        this.error = null;
      } catch (err) {
        this.error = err.message;
        console.error('Error loading posts:', err);
      } finally {
        this.loading = false;
      }
    },
    async createPost() {
      try {
        await postsAPI.create({
          content: "Bài viết mới từ Vue",
          subject: "toan",
          post_type: "text",
        });
        await this.loadPosts();
        alert('Tạo post thành công!');
      } catch (err) {
        alert('Lỗi: ' + err.message);
      }
    },
    async likePost(postId) {
      try {
        await postsAPI.like(postId);
        await this.loadPosts();
      } catch (err) {
        alert('Lỗi: ' + err.message);
      }
    },
  },
};
</script>

