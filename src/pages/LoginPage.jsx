// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/solid';
import { UserIcon, LockClosedIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import useToast from '../hooks/useToast';

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { login, loading } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      await login(username, password);
      toast.success("Đăng nhập thành công!");
      navigate('/chat');
    } catch (error) {
      let errorMessage;
      
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          errorMessage = "Tài khoản hoặc mật khẩu không chính xác";
        } else if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Lỗi ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage = "Không nhận được phản hồi từ máy chủ";
      } else {
        errorMessage = error.message || "Đã xảy ra lỗi khi đăng nhập";
      }
      
      toast.error(errorMessage);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 bg-[size:200%_200%] animate-gradient">
      {/* Left panel with illustration - hidden on mobile */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/2 bg-gradient-to-br from-blue-700 to-purple-700 items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 left-10 w-40 h-40 rounded-full bg-white/20 blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-60 h-60 rounded-full bg-white/20 blur-xl"></div>
        </div>
        
        <div className="animate-float">
          <ChatBubbleLeftEllipsisIcon className="w-24 h-24 mb-8 text-white drop-shadow-lg" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4 animate-slide-up">Chat AI</h1>
        <p className="text-xl mb-8 text-center max-w-md animate-slide-up" style={{animationDelay: '100ms'}}>
          Nền tảng trò chuyện AI thông minh giúp bạn tìm câu trả lời nhanh chóng
        </p>
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-3xl shadow-subtle max-w-md animate-slide-up border border-white/20" style={{animationDelay: '200ms'}}>
          <p className="italic text-white/90">"Chat AI là công cụ tuyệt vời giúp tôi tìm kiếm thông tin và giải quyết vấn đề nhanh chóng. Giao diện đơn giản và trực quan làm cho việc sử dụng trở nên dễ dàng."</p>
          <p className="mt-4 font-semibold">- Người dùng Chat AI</p>
        </div>
      </div>

      {/* Right panel with login form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 animate-fade-in">
        <div className="w-full max-w-md">
          {/* Mobile logo - only visible on mobile */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="bg-gradient-to-br from-primary-600 to-secondary-600 p-5 rounded-2xl mb-4 shadow-glow animate-float">
              <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent">Chat AI</h1>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100">
            <h2 className="text-2xl font-display font-bold text-center bg-gradient-to-r from-primary-700 to-secondary-700 bg-clip-text text-transparent mb-8">Đăng Nhập</h2>
            
            <form className="space-y-6" onSubmit={handleLogin}>
              {/* Username Input with icon */}
              <div className="animate-slide-up" style={{animationDelay: '100ms'}}>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Tên đăng nhập
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="username"
                    type="text"
                    className="pl-10 block w-full rounded-xl border border-gray-300 py-3 text-gray-700 placeholder:text-gray-400 
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300
                    bg-white/50 hover:bg-white"
                    placeholder="Nhập tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>
              
              {/* Password Input with icon and toggle */}
              <div className="animate-slide-up" style={{animationDelay: '200ms'}}>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mật khẩu
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <LockClosedIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                  </div>
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="pl-10 block w-full rounded-xl border border-gray-300 py-3 text-gray-700 placeholder:text-gray-400 
                    focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300
                    bg-white/50 hover:bg-white"
                    placeholder="Nhập mật khẩu"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-primary-500 transition-colors" />
                    ) : (
                      <EyeIcon className="h-5 w-5 text-gray-400 hover:text-primary-500 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Remember me & Forgot password */}
              <div className="flex items-center justify-between text-sm animate-slide-up" style={{animationDelay: '300ms'}}>
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-gray-600">
                    Ghi nhớ đăng nhập
                  </label>
                </div>
                <a href="#" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                  Quên mật khẩu?
                </a>
              </div>

              {/* Submit Button */}
              <div className="animate-slide-up" style={{animationDelay: '400ms'}}>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-base 
                  font-medium text-white transition-all duration-300
                  ${loading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-subtle hover:shadow-glow'
                  }`}
                >
                  {loading && <Spinner />}
                  {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
              </div>
            </form>

            {/* Sign up link */}
            <p className="mt-6 text-center text-sm text-gray-600 animate-slide-up" style={{animationDelay: '500ms'}}>
              Chưa có tài khoản?{' '}
              <Link to="/register" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                Đăng ký ngay
              </Link>
            </p>
          </div>
          
          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Chat AI - Tất cả các quyền được bảo lưu
          </p>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;