/**
 * Auth Context - Quản lý authentication state toàn app
 * Hỗ trợ Firebase Auth và tích hợp với Backend API
 */
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../config/firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Lắng nghe thay đổi auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Đăng nhập với email/password
  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      // Map Firebase errors to Vietnamese
      let errorMessage = 'Đăng nhập thất bại';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Email không tồn tại';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Mật khẩu không đúng';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email không hợp lệ';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Tài khoản đã bị vô hiệu hóa';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Quá nhiều lần thử. Vui lòng thử lại sau';
          break;
        default:
          errorMessage = error.message || 'Đăng nhập thất bại';
      }
      throw new Error(errorMessage);
    }
  };

  // Đăng ký với email/password
  const register = async (email: string, password: string, displayName: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Cập nhật display name
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: displayName,
        });
      }
    } catch (error: any) {
      // Map Firebase errors to Vietnamese
      let errorMessage = 'Đăng ký thất bại';
      switch (error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Email đã được sử dụng';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email không hợp lệ';
          break;
        case 'auth/weak-password':
          errorMessage = 'Mật khẩu quá yếu (tối thiểu 6 ký tự)';
          break;
        case 'auth/operation-not-allowed':
          errorMessage = 'Phương thức đăng ký không được phép';
          break;
        default:
          errorMessage = error.message || 'Đăng ký thất bại';
      }
      throw new Error(errorMessage);
    }
  };

  // Đăng nhập với Google
  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      // Thêm scopes nếu cần
      provider.addScope('profile');
      provider.addScope('email');
      
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      // Map Firebase errors to Vietnamese
      let errorMessage = 'Đăng nhập với Google thất bại';
      switch (error.code) {
        case 'auth/popup-closed-by-user':
          errorMessage = 'Bạn đã đóng cửa sổ đăng nhập';
          break;
        case 'auth/popup-blocked':
          errorMessage = 'Cửa sổ popup bị chặn. Vui lòng cho phép popup';
          break;
        case 'auth/cancelled-popup-request':
          errorMessage = 'Yêu cầu đăng nhập đã bị hủy';
          break;
        default:
          errorMessage = error.message || 'Đăng nhập với Google thất bại';
      }
      throw new Error(errorMessage);
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error('Đăng xuất thất bại: ' + error.message);
    }
  };

  // Lấy ID token (dùng cho API calls)
  const getIdToken = async (): Promise<string | null> => {
    if (!currentUser) return null;
    try {
      return await currentUser.getIdToken();
    } catch (error) {
      console.error('Error getting ID token:', error);
      return null;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loading,
    login,
    register,
    loginWithGoogle,
    logout,
    getIdToken,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

