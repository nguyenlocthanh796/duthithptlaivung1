import React, { useState } from 'react';
import { signInWithPopup, signInWithRedirect, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../services/firebase';
import { Sparkles, BookOpen, BrainCircuit, TrendingUp, Shield, Mail, Lock, Eye, EyeOff, User } from 'lucide-react';

const LoginPage = () => {
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Email/Password form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Google Sign In với popup (fallback redirect)
  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError('Firebase chưa được khởi tạo. Vui lòng thử lại sau.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('profile');
      provider.addScope('email');
      
      // Thử popup trước (hoạt động tốt trên Firefox)
      try {
        const result = await signInWithPopup(auth, provider);
        console.log('✅ Đăng nhập thành công với popup:', result.user?.email || result.user?.displayName || 'User');
        // Suppress Cross-Origin-Opener-Policy warnings (không ảnh hưởng chức năng)
        if (window.console && window.console.warn) {
          const originalWarn = console.warn;
          console.warn = function(...args) {
            if (args[0] && typeof args[0] === 'string' && args[0].includes('Cross-Origin-Opener-Policy')) {
              return; // Suppress COOP warnings
            }
            originalWarn.apply(console, args);
          };
          // Restore sau 2 giây
          setTimeout(() => {
            console.warn = originalWarn;
          }, 2000);
        }
      } catch (popupError) {
        // Nếu popup bị chặn, fallback sang redirect
        if (popupError.code === 'auth/popup-blocked' || popupError.code === 'auth/popup-closed-by-user') {
          console.warn('Popup bị chặn, chuyển sang redirect mode...');
          sessionStorage.setItem('auth_redirect', window.location.href);
          await signInWithRedirect(auth, provider);
          return; // Sẽ redirect, không cần set loading = false
        }
        throw popupError;
      }
    } catch (error) {
      console.error('❌ Lỗi đăng nhập Google:', error);
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
      
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = 'Domain chưa được authorized. Vui lòng kiểm tra Firebase Console.';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Google Sign-In chưa được enable. Vui lòng kiểm tra Firebase Console.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password Sign Up
  const handleEmailSignUp = async (e) => {
    e.preventDefault();
    if (!auth) {
      setError('Firebase chưa được khởi tạo. Vui lòng thử lại sau.');
      return;
    }

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Cập nhật display name nếu có
      if (displayName.trim()) {
        await updateProfile(userCredential.user, {
          displayName: displayName.trim()
        });
      }
      
      console.log('✅ Đăng ký thành công:', userCredential.user);
      // User sẽ được tự động set trong App.jsx qua onAuthStateChanged
    } catch (error) {
      console.error('❌ Lỗi đăng ký:', error);
      let errorMessage = 'Đăng ký thất bại. Vui lòng thử lại.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Email/Password Sign In
  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    if (!auth) {
      setError('Firebase chưa được khởi tạo. Vui lòng thử lại sau.');
      return;
    }

    if (!email || !password) {
      setError('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Đăng nhập thành công:', userCredential.user);
      // User sẽ được tự động set trong App.jsx qua onAuthStateChanged
    } catch (error) {
      console.error('❌ Lỗi đăng nhập:', error);
      let errorMessage = 'Đăng nhập thất bại. Vui lòng thử lại.';
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'Không tìm thấy tài khoản. Vui lòng kiểm tra email hoặc đăng ký tài khoản mới.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Mật khẩu không đúng. Vui lòng thử lại.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Email không hợp lệ. Vui lòng kiểm tra lại.';
      } else if (error.code === 'auth/invalid-credential') {
        errorMessage = 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left Side: Branding & Features */}
        <div className="hidden md:block space-y-8">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl text-white flex items-center justify-center font-bold text-2xl shadow-lg shadow-blue-200">
                D
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">DuThi<span className="text-gray-600">Pro</span></h1>
                <p className="text-sm text-gray-500">Nền tảng học tập thông minh</p>
              </div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Học tập hiệu quả hơn với AI
            </h2>
            <p className="text-gray-600 mb-8 leading-relaxed">
              Nền tảng học tập tích hợp AI, giúp bạn ôn thi THPT hiệu quả với ngân hàng đề thi phong phú, 
              trợ lý AI thông minh và cộng đồng học tập sôi động.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Sparkles className="text-blue-600" size={20} />
              </div>
              <h3 className="font-bold text-sm text-gray-900 mb-1">Trợ lý AI</h3>
              <p className="text-xs text-gray-500">Giải đáp mọi thắc mắc 24/7</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-3">
                <BookOpen className="text-purple-600" size={20} />
              </div>
              <h3 className="font-bold text-sm text-gray-900 mb-1">Ngân hàng đề</h3>
              <p className="text-xs text-gray-500">Hàng nghìn đề thi chất lượng</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                <BrainCircuit className="text-indigo-600" size={20} />
              </div>
              <h3 className="font-bold text-sm text-gray-900 mb-1">Lớp học online</h3>
              <p className="text-xs text-gray-500">Học cùng giáo viên và bạn bè</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3">
                <TrendingUp className="text-emerald-600" size={20} />
              </div>
              <h3 className="font-bold text-sm text-gray-900 mb-1">Thống kê tiến độ</h3>
              <p className="text-xs text-gray-500">Theo dõi kết quả học tập</p>
            </div>
          </div>
        </div>

        {/* Right Side: Login/Signup Form */}
        <div className="w-full">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8 md:p-10">
            {/* Mobile Logo */}
            <div className="md:hidden flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl text-white flex items-center justify-center font-bold text-xl shadow-md">
                D
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">DuThi<span className="text-gray-600">Pro</span></h1>
                <p className="text-xs text-gray-500">Nền tảng học tập thông minh</p>
              </div>
            </div>

            {/* Tabs: Login/Signup */}
            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                  mode === 'login'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Đăng nhập
              </button>
              <button
                onClick={() => {
                  setMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 px-4 rounded-lg font-semibold text-sm transition-all ${
                  mode === 'signup'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Đăng ký
              </button>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {mode === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
              </h2>
              <p className="text-gray-600">
                {mode === 'login' 
                  ? 'Đăng nhập để tiếp tục học tập và khám phá các tính năng mới'
                  : 'Đăng ký để bắt đầu hành trình học tập của bạn'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Email/Password Form */}
            <form onSubmit={mode === 'login' ? handleEmailSignIn : handleEmailSignUp} className="space-y-4 mb-6">
              {mode === 'signup' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Họ và tên
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Nhập họ và tên (tùy chọn)"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'login' ? 'Nhập mật khẩu' : 'Tối thiểu 6 ký tự'}
                    required
                    minLength={6}
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Đang xử lý...
                  </span>
                ) : (
                  mode === 'login' ? 'Đăng nhập' : 'Đăng ký'
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-sm text-gray-500">hoặc</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Google Sign In Button */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Đang đăng nhập...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span>Đăng nhập với Google</span>
                </>
              )}
            </button>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <Shield size={14} />
                <span>Bảo mật và riêng tư được đảm bảo</span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Bằng cách đăng nhập, bạn đồng ý với{' '}
                <a href="#" className="text-blue-600 hover:underline">Điều khoản sử dụng</a>
                {' '}và{' '}
                <a href="#" className="text-blue-600 hover:underline">Chính sách bảo mật</a>
                {' '}của chúng tôi.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
