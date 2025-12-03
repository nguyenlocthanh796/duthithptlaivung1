/**
 * Admin Dashboard - Tổng quan hệ thống
 */
import React, { useEffect, useState } from 'react';
import { BarChart3, Users, FileText, MessageCircle, TrendingUp, Activity } from 'lucide-react';
import { Card } from '../ui';
import { adminAPI, AdminStats } from '../../services/admin-api';
import { LoadingSpinner } from '../common';

const AdminDashboard: React.FC<{ showToast: (msg: string, type: 'success' | 'error') => void }> = ({
  showToast,
}) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getStats();
      setStats(data);
    } catch (error: any) {
      showToast('Không thể tải thống kê: ' + (error.message || 'Lỗi không xác định'), 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Đang tải thống kê..." fullScreen={false} />;
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-neutral-500">
        Không có dữ liệu thống kê
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-neutral-900">Dashboard Admin</h1>
        <button
          onClick={() => void loadStats()}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          Làm mới
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Tổng Users</p>
              <p className="text-3xl font-bold text-neutral-900">{stats.users.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Tổng Posts</p>
              <p className="text-3xl font-bold text-neutral-900">{stats.posts.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <FileText className="text-green-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Tổng Comments</p>
              <p className="text-3xl font-bold text-neutral-900">{stats.comments.total}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <MessageCircle className="text-purple-600" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Posts Pending</p>
              <p className="text-3xl font-bold text-neutral-900">
                {stats.posts.by_status.pending || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
              <Activity className="text-yellow-600" size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <BarChart3 size={20} />
            Users theo Role
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.users.by_role).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700 capitalize">{role}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-600 rounded-full"
                      style={{
                        width: `${(count / stats.users.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-neutral-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Posts by Subject */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Posts theo Môn học
          </h2>
          <div className="space-y-3">
            {Object.entries(stats.posts.by_subject).map(([subject, count]) => (
              <div key={subject} className="flex items-center justify-between">
                <span className="text-sm font-medium text-neutral-700 capitalize">{subject}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-600 rounded-full"
                      style={{
                        width: `${(count / stats.posts.total) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-bold text-neutral-900 w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Posts by Status */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold text-neutral-900 mb-4">Posts theo Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(stats.posts.by_status).map(([status, count]) => (
            <div key={status} className="p-4 bg-neutral-50 rounded-lg">
              <p className="text-sm text-neutral-600 mb-1 capitalize">{status}</p>
              <p className="text-2xl font-bold text-neutral-900">{count}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default AdminDashboard;

