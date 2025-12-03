/**
 * Post Management - Quản lý posts
 */
import React, { useEffect, useState } from 'react';
import { FileText, Search, Trash2, Check, X, Clock } from 'lucide-react';
import { Card, Badge, Button } from '../ui';
import { adminAPI } from '../../services/admin-api';
import { LoadingSpinner, EmptyState } from '../common';
import { useDebounce } from '../../hooks/useDebounce';
import { MathText } from '../math';

const PostManagement: React.FC<{ showToast: (msg: string, type: 'success' | 'error') => void }> = ({
  showToast,
}) => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    void loadPosts();
  }, [debouncedSearch, subjectFilter, statusFilter]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getAllPosts({
        limit: 100,
        search: debouncedSearch || undefined,
        subject: subjectFilter !== 'all' ? subjectFilter : undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setPosts(data);
    } catch (error: any) {
      showToast('Không thể tải danh sách posts: ' + (error.message || 'Lỗi không xác định'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm('Xác nhận xóa bài viết này?')) return;
    try {
      await adminAPI.deletePost(postId);
      showToast('Đã xóa bài viết thành công', 'success');
      void loadPosts();
    } catch (error: any) {
      showToast('Không thể xóa bài viết: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const handleUpdateStatus = async (postId: string, status: 'pending' | 'approved' | 'rejected') => {
    try {
      await adminAPI.updatePostStatus(postId, status);
      showToast('Đã cập nhật status thành công', 'success');
      void loadPosts();
    } catch (error: any) {
      showToast('Không thể cập nhật status: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'primary' | 'success' | 'warning' | 'error'> = {
      approved: 'success',
      pending: 'warning',
      rejected: 'error',
    };
    return (
      <Badge variant={variants[status] || 'primary'} size="sm">
        <span className="capitalize">{status}</span>
      </Badge>
    );
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Đang tải danh sách posts..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-neutral-900 flex items-center gap-2">
          <FileText size={32} />
          Quản lý Posts
        </h1>
        <div className="text-sm text-neutral-600">
          Tổng: <span className="font-bold text-neutral-900">{posts.length}</span> posts
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm posts..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tất cả status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </Card>

      {/* Posts List */}
      {posts.length === 0 ? (
        <EmptyState
          icon="search"
          title="Không tìm thấy posts"
          description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
        />
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold text-neutral-900">{post.author_name}</span>
                      {getStatusBadge(post.status || 'approved')}
                      <Badge variant="primary" size="sm">
                        {post.subject}
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-600 mb-2">
                      <MathText content={post.content} className="line-clamp-2" />
                    </div>
                    <p className="text-xs text-neutral-500">
                      {new Date(post.createdAt).toLocaleString('vi-VN')} | ID: {post.id}
                    </p>
                  </div>
                </div>

                {post.image_url && (
                  <div className="w-32 h-32 rounded-lg overflow-hidden bg-neutral-100">
                    <img src={post.image_url} alt="Post" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-neutral-200">
                  {post.status === 'pending' && (
                    <>
                      <Button
                        size="sm"
                        variant="success"
                        icon={<Check size={14} />}
                        onClick={() => void handleUpdateStatus(post.id, 'approved')}
                      >
                        Duyệt
                      </Button>
                      <Button
                        size="sm"
                        variant="error"
                        icon={<X size={14} />}
                        onClick={() => void handleUpdateStatus(post.id, 'rejected')}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  {post.status === 'approved' && (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<Clock size={14} />}
                      onClick={() => void handleUpdateStatus(post.id, 'pending')}
                    >
                      Đưa về Pending
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Trash2 size={14} />}
                    onClick={() => void handleDeletePost(post.id)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PostManagement;

