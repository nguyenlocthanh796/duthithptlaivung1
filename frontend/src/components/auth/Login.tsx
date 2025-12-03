/**
 * Component Login hoàn chỉnh với Firebase Auth
 * Hỗ trợ: Email/Password, Google Sign-in, Register
 * UI/UX được nâng cấp với Design System mới
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Input, Card } from '../ui';
import { Mail, Lock, User, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true); // Toggle giữa Login và Register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { login, register, loginWithGoogle, currentUser } = useAuth();
  const navigate = useNavigate();

  // Nếu đã đăng nhập, redirect
  React.useEffect(() => {
    if (currentUser) {
      navigate('/');
    }
  }, [currentUser, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    if (!isLogin && !displayName.trim()) {
      setError('Vui lòng nhập tên hiển thị');
      return;
    }

    try {
      setLoading(true);

      if (isLogin) {
        // Đăng nhập
        await login(email, password);
        setSuccess('Đăng nhập thành công!');
        setTimeout(() => {
          navigate('/');
        }, 1000);
      } else {
        // Đăng ký
        await register(email, password, displayName);
        setSuccess('Đăng ký thành công! Đang chuyển hướng...');
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      await loginWithGoogle();
      setSuccess('Đăng nhập với Google thành công!');
      setTimeout(() => {
        navigate('/');
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Không thể đăng nhập với Google');
      console.error('Google login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 via-accent-600 to-primary-800 p-4 animate-fade-in">
      <div className="w-full max-w-md animate-scale-in">
        <Card className="p-8 md:p-10" padding="none">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 shadow-lg shadow-primary-500/30 mb-4">
              <Sparkles size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold text-gradient mb-2">
              {isLogin ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
            </h1>
            <p className="text-neutral-600 text-sm">
              {isLogin ? 'Đăng nhập để tiếp tục học tập' : 'Tham gia cùng hàng nghìn học sinh'}
            </p>
          </div>

          {/* Success message */}
          {success && (
            <div className="mb-6 p-4 rounded-xl bg-success-50 border border-success-200 flex items-start gap-3 animate-slide-down">
              <CheckCircle size={20} className="text-success-600 mt-0.5 flex-shrink-0" />
              <p className="text-success-700 text-sm font-medium flex-1">{success}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-error-50 border border-error-200 flex items-start gap-3 animate-slide-down">
              <AlertCircle size={20} className="text-error-600 mt-0.5 flex-shrink-0" />
              <p className="text-error-700 text-sm font-medium flex-1">{error}</p>
            </div>
          )}

          {/* Google Sign-in Button */}
          <Button
            variant="outline"
            fullWidth
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mb-6"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" className="flex-shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>{isLogin ? 'Đăng nhập với Google' : 'Đăng ký với Google'}</span>
          </Button>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-neutral-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-white text-neutral-500">hoặc</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Tên hiển thị"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Nhập tên của bạn"
                disabled={loading}
                required={!isLogin}
                icon={User}
              />
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              required
              icon={Mail}
            />

            <Input
              label="Mật khẩu"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
              minLength={6}
              icon={Lock}
            />

            {!isLogin && (
              <Input
                label="Xác nhận mật khẩu"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                required={!isLogin}
                minLength={6}
                icon={Lock}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              className="mt-6"
            >
              {isLogin ? 'Đăng nhập' : 'Đăng ký'}
            </Button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-600">
              {isLogin ? 'Chưa có tài khoản? ' : 'Đã có tài khoản? '}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                  setSuccess(null);
                }}
                className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
              >
                {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Login;

