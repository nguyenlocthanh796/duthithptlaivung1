/**
 * Admin Route Protection
 * Chỉ cho phép admin truy cập
 */
import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../common';
import { usersAPI } from '../../services/users-api';

interface AdminRouteProps {
  children: React.ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { currentUser, loading: authLoading } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminRole = async () => {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      try {
        // Lấy thông tin user từ backend để kiểm tra role
        const userInfo = await usersAPI.getMe();
        setUserRole(userInfo.role || 'student');
      } catch (error) {
        console.error('Error checking admin role:', error);
        setUserRole('student');
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      void checkAdminRole();
    }
  }, [currentUser, authLoading]);

  if (authLoading || loading) {
    return <LoadingSpinner size="lg" text="Đang kiểm tra quyền..." fullScreen={true} />;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (userRole !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;

