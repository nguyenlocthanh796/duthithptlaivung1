/**
 * Custom hook để lấy và quản lý user role
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usersAPI } from '../services/users-api';

export const useUserRole = () => {
  const { currentUser } = useAuth();
  const [role, setRole] = useState<string>('student');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRole = async () => {
      if (!currentUser) {
        setRole('student');
        setLoading(false);
        return;
      }

      try {
        const userInfo = await usersAPI.getMe();
        setRole(userInfo.role || 'student');
      } catch (error) {
        console.error('Error loading user role:', error);
        setRole('student');
      } finally {
        setLoading(false);
      }
    };

    void loadRole();
  }, [currentUser]);

  const isAdmin = role === 'admin';
  const isTeacher = role === 'teacher';
  const isStudent = role === 'student';

  return {
    role,
    isAdmin,
    isTeacher,
    isStudent,
    loading,
  };
};

