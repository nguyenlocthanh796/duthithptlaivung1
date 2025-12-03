/**
 * Component hiển thị thông tin user và nút logout
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleLogout = async () => {
    if (!window.confirm('Bạn có chắc muốn đăng xuất?')) {
      return;
    }

    try {
      setLoading(true);
      await logout();
      navigate('/login');
    } catch (error: any) {
      alert('Lỗi đăng xuất: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      padding: '10px 20px',
      background: '#f5f5f5',
      borderRadius: '8px',
    }}>
      {/* Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: currentUser.photoURL || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize: '18px',
        overflow: 'hidden',
      }}>
        {currentUser.photoURL ? (
          <img 
            src={currentUser.photoURL} 
            alt={currentUser.displayName || 'User'} 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          (currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()
        )}
      </div>

      {/* User Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '600', color: '#333' }}>
          {currentUser.displayName || 'Người dùng'}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          {currentUser.email}
        </div>
      </div>

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        disabled={loading}
        style={{
          padding: '8px 16px',
          background: loading ? '#ccc' : '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          fontWeight: '500',
        }}
      >
        {loading ? 'Đang đăng xuất...' : 'Đăng xuất'}
      </button>
    </div>
  );
};

export default UserProfile;

