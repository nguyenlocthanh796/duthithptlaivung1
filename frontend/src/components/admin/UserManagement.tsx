/**
 * User Management - Quản lý users
 */
import React, { useEffect, useState } from 'react';
import { Users, Search, Edit2, Trash2, User as UserIcon, GraduationCap, Crown } from 'lucide-react';
import { Card, Badge, Button } from '../ui';
import { adminAPI, User } from '../../services/admin-api';
import { LoadingSpinner, EmptyState } from '../common';
import { useDebounce } from '../../hooks/useDebounce';

const UserManagement: React.FC<{ showToast: (msg: string, type: 'success' | 'error') => void }> = ({
  showToast,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('');
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    void loadUsers();
  }, [debouncedSearch, roleFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getUsers({
        limit: 100,
        search: debouncedSearch || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
      setUsers(data);
    } catch (error: any) {
      showToast('Không thể tải danh sách users: ' + (error.message || 'Lỗi không xác định'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, role: string) => {
    try {
      await adminAPI.updateUserRole(userId, role);
      showToast('Đã cập nhật role thành công', 'success');
      setEditingUserId(null);
      void loadUsers();
    } catch (error: any) {
      showToast('Không thể cập nhật role: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Xác nhận xóa user: ${userName}?`)) return;
    try {
      await adminAPI.deleteUser(userId);
      showToast('Đã xóa user thành công', 'success');
      void loadUsers();
    } catch (error: any) {
      showToast('Không thể xóa user: ' + (error.message || 'Lỗi không xác định'), 'error');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown size={16} className="text-yellow-600" />;
      case 'teacher':
        return <GraduationCap size={16} className="text-blue-600" />;
      default:
        return <UserIcon size={16} className="text-neutral-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, 'primary' | 'success' | 'warning'> = {
      admin: 'warning',
      teacher: 'success',
      student: 'primary',
    };
    return (
      <Badge variant={variants[role] || 'primary'} size="sm">
        {getRoleIcon(role)}
        <span className="ml-1 capitalize">{role}</span>
      </Badge>
    );
  };

  if (loading) {
    return <LoadingSpinner size="lg" text="Đang tải danh sách users..." fullScreen={false} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-neutral-900 flex items-center gap-2">
          <Users size={32} />
          Quản lý Users
        </h1>
        <div className="text-sm text-neutral-600">
          Tổng: <span className="font-bold text-neutral-900">{users.length}</span> users
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
              placeholder="Tìm kiếm user (tên, email)..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-neutral-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">Tất cả roles</option>
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </Card>

      {/* Users List */}
      {users.length === 0 ? (
        <EmptyState
          icon="search"
          title="Không tìm thấy users"
          description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm"
        />
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center text-white font-bold">
                    {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-neutral-900">{user.name || user.email}</h3>
                      {getRoleBadge(user.role)}
                    </div>
                    <p className="text-sm text-neutral-600 mt-1">{user.email}</p>
                    <p className="text-xs text-neutral-500 mt-1">
                      ID: {user.uid} | Created: {new Date(user.createdAt || '').toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="px-3 py-1.5 rounded-lg border border-neutral-300 text-sm"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => {
                          setNewRole(user.role);
                          void handleUpdateRole(user.id, newRole);
                        }}
                      >
                        Lưu
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setEditingUserId(null);
                          setNewRole('');
                        }}
                      >
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Edit2 size={14} />}
                        onClick={() => {
                          setEditingUserId(user.id);
                          setNewRole(user.role);
                        }}
                      >
                        Đổi Role
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<Trash2 size={14} />}
                        onClick={() => void handleDeleteUser(user.id, user.name || user.email)}
                      >
                        Xóa
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserManagement;

