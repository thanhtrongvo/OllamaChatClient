// src/pages/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChatBubbleLeftEllipsisIcon } from '@heroicons/react/24/solid';
import { UserIcon, EnvelopeIcon, LockClosedIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import useToast from '../hooks/useToast';

// Component Spinner
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [message, setMessage] = useState('');
  const [successful, setSuccessful] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const toast = useToast();
  const { register, loading } = useAuth();

  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    if (firstName.trim().length === 0) {
      newErrors.firstName = 'Vui lòng nhập tên';
      isValid = false;
      toast.warning('Vui lòng nhập tên');
    }
    
    if (lastName.trim().length === 0) {
      newErrors.lastName = 'Vui lòng nhập họ';
      isValid = false;
      toast.warning('Vui lòng nhập họ');
    }
    
    if (username.length < 3) {
      newErrors.username = 'Tên đăng nhập phải có ít nhất 3 ký tự';
      isValid = false;
      toast.warning('Tên đăng nhập phải có ít nhất 3 ký tự');
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Email không hợp lệ';
      isValid = false;
      toast.warning('Email không hợp lệ');
    }
    
    if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      isValid = false;
      toast.warning('Mật khẩu phải có ít nhất 6 ký tự');
    }
    
    setErrors(newErrors);
    
    // Only show the general validation error toast if there are multiple errors
    if (!isValid && Object.keys(newErrors).length > 1) {
      toast.warning('Vui lòng kiểm tra lại thông tin đăng ký');
    }
    
    return isValid;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage('');
    setSuccessful(false);
    setErrors({});
    
    if (!validateForm()) {
      return;
    }
    
    toast.info('Đang xử lý đăng ký...');

    try {
      const registerData = {
        username,
        email,
        password,
        firstName,
        lastName
      };
      
      const response = await register(registerData);
      const successMessage = response.message || 'Đăng ký thành công! Vui lòng đăng nhập.';
      setMessage(successMessage);
      setSuccessful(true);
      
      // Hiển thị toast thành công
      toast.success(successMessage);
      
      // Tự động chuyển đến trang đăng nhập sau 3 giây
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (error) {
      let errorMessage = "Đăng ký thất bại";
      
      if (error.response) {
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.status === 409) {
          errorMessage = "Tên đăng nhập hoặc email đã được sử dụng";
        } else {
          errorMessage = `Lỗi ${error.response.status}: ${error.response.statusText}`;
        }
      } else if (error.request) {
        errorMessage = "Không nhận được phản hồi từ máy chủ";
      } else {
        errorMessage = error.message || "Đã xảy ra lỗi khi đăng ký";
      }
      
      setMessage(errorMessage);
      setSuccessful(false);
      
      // Hiển thị toast lỗi
      toast.error(errorMessage);
    }
  };

  // Thêm hàm xử lý các thay đổi input với phản hồi toast
  const handleInputChange = (field, value, validator) => {
    switch(field) {
      case 'firstName':
        setFirstName(value);
        break;
      case 'lastName':
        setLastName(value);
        break;
      case 'username':
        setUsername(value);
        break;
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      default:
        break;
    }
    
    // Xóa lỗi khi người dùng bắt đầu sửa
    if (errors[field]) {
      const newErrors = { ...errors };
      delete newErrors[field];
      setErrors(newErrors);
    }
    
    // Validate và hiển thị toast nếu cần
    if (validator && !validator(value)) {
      // Chỉ validate khi người dùng đã nhập xong (blur event sẽ gọi hàm này với validator)
      return false;
    }
    return true;
  };

  // Validate riêng từng trường khi blur
  const validateField = (field, value) => {
    switch(field) {
      case 'firstName':
        if (value.trim().length === 0) {
          setErrors({...errors, firstName: 'Vui lòng nhập tên'});
          return false;
        }
        return true;
        
      case 'lastName':
        if (value.trim().length === 0) {
          setErrors({...errors, lastName: 'Vui lòng nhập họ'});
          return false;
        }
        return true;
        
      case 'username':
        if (value.length < 3) {
          setErrors({...errors, username: 'Tên đăng nhập phải có ít nhất 3 ký tự'});
          return false;
        }
        return true;
        
      case 'email':
        if (!/\S+@\S+\.\S+/.test(value)) {
          setErrors({...errors, email: 'Email không hợp lệ'});
          return false;
        }
        return true;
        
      case 'password':
        if (value.length < 6) {
          setErrors({...errors, password: 'Mật khẩu phải có ít nhất 6 ký tự'});
          return false;
        }
        return true;
        
      default:
        return true;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 bg-[size:200%_200%] animate-gradient">
      {/* Left panel with illustration - hidden on mobile */}
      <div className="hidden lg:flex lg:flex-col lg:w-1/2 bg-gradient-to-br from-blue-700 to-purple-700 items-center justify-center p-12 text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full opacity-10">
          <div className="absolute top-10 right-10 w-40 h-40 rounded-full bg-white/20 blur-xl"></div>
          <div className="absolute bottom-10 left-10 w-60 h-60 rounded-full bg-white/20 blur-xl"></div>
        </div>
        
        <div className="animate-float">
          <ChatBubbleLeftEllipsisIcon className="w-24 h-24 mb-8 text-white drop-shadow-lg" />
        </div>
        <h1 className="text-4xl font-display font-bold mb-4 animate-slide-up">Chat AI</h1>
        <p className="text-xl mb-8 text-center max-w-md animate-slide-up" style={{animationDelay: '100ms'}}>
          Tạo tài khoản để trải nghiệm trò chuyện thông minh với AI của chúng tôi
        </p>
        <div className="bg-white/10 backdrop-blur-sm p-6 rounded-3xl shadow-subtle max-w-md animate-slide-up border border-white/20" style={{animationDelay: '200ms'}}>
          <p className="italic text-white/90">"Đăng ký tài khoản Chat AI giúp bạn lưu trữ lịch sử trò chuyện, tùy chỉnh giao diện và trải nghiệm nhiều tính năng nâng cao hơn."</p>
          <p className="mt-4 font-semibold">- Đội ngũ phát triển Chat AI</p>
        </div>
      </div>

      {/* Right panel with registration form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 animate-fade-in">
        <div className="w-full max-w-md">
          {/* Mobile logo - only visible on mobile */}
          <div className="flex flex-col items-center mb-10 lg:hidden">
            <div className="bg-gradient-to-br from-secondary-600 to-primary-600 p-5 rounded-2xl mb-4 shadow-glow animate-float">
              <ChatBubbleLeftEllipsisIcon className="w-16 h-16 text-white" />
            </div>
            <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-secondary-600 to-primary-600 bg-clip-text text-transparent">Chat AI</h1>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-card hover:shadow-card-hover transition-all duration-300 border border-gray-100">
            <h2 className="text-2xl font-display font-bold text-center bg-gradient-to-r from-secondary-700 to-primary-700 bg-clip-text text-transparent mb-6">Đăng Ký Tài Khoản</h2>

            {/* Thông báo */}
            {message && (
              <div
                className={`p-4 mb-6 text-sm rounded-xl text-center animate-fade-in border ${
                  successful
                    ? 'text-green-700 bg-green-50 border-green-100'
                    : 'text-red-700 bg-red-50 border-red-100'
                }`}
                role="alert"
              >
                {message}
              </div>
            )}

            {!successful && (
              <form className="space-y-4" onSubmit={handleRegister}>
                {/* First Name & Last Name Row */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 animate-slide-up" style={{animationDelay: '100ms'}}>
                  {/* First Name Input */}
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      Tên
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCircleIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        id="firstName"
                        className={`pl-10 block w-full rounded-xl border ${errors.firstName ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} py-3 text-gray-700 placeholder:text-gray-400 
                        focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300
                        bg-white/50 hover:bg-white`}
                        value={firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        onBlur={(e) => {
                          if (!validateField('firstName', e.target.value)) {
                            toast.warning('Vui lòng nhập tên');
                          }
                        }}
                        placeholder="Tên"
                        required
                      />
                    </div>
                    {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                  </div>

                  {/* Last Name Input */}
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Họ
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <UserCircleIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                      </div>
                      <input
                        type="text"
                        id="lastName"
                        className={`pl-10 block w-full rounded-xl border ${errors.lastName ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} py-3 text-gray-700 placeholder:text-gray-400 
                        focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300
                        bg-white/50 hover:bg-white`}
                        value={lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        onBlur={(e) => {
                          if (!validateField('lastName', e.target.value)) {
                            toast.warning('Vui lòng nhập họ');
                          }
                        }}
                        placeholder="Họ"
                        required
                      />
                    </div>
                    {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                  </div>
                </div>

                {/* Username Input */}
                <div className="animate-slide-up" style={{animationDelay: '200ms'}}>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Tên đăng nhập
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <UserIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      id="username"
                      className={`pl-10 block w-full rounded-xl border ${errors.username ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} py-3 text-gray-700 placeholder:text-gray-400 
                      focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300
                      bg-white/50 hover:bg-white`}
                      value={username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      onBlur={(e) => {
                        if (!validateField('username', e.target.value)) {
                          toast.warning('Tên đăng nhập phải có ít nhất 3 ký tự');
                        }
                      }}
                      placeholder="Nhập tên đăng nhập"
                      required
                    />
                  </div>
                  {errors.username && <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
                </div>

                {/* Email Input */}
                <div className="animate-slide-up" style={{animationDelay: '300ms'}}>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <input
                      type="email"
                      id="email"
                      className={`pl-10 block w-full rounded-xl border ${errors.email ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} py-3 text-gray-700 placeholder:text-gray-400 
                      focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300
                      bg-white/50 hover:bg-white`}
                      value={email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onBlur={(e) => {
                        if (!validateField('email', e.target.value)) {
                          toast.warning('Email không hợp lệ');
                        }
                      }}
                      placeholder="email@example.com"
                      required
                    />
                  </div>
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>

                {/* Password Input */}
                <div className="animate-slide-up" style={{animationDelay: '400ms'}}>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Mật khẩu
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LockClosedIcon className="h-5 w-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                    </div>
                    <input
                      type="password"
                      id="password"
                      className={`pl-10 block w-full rounded-xl border ${errors.password ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'} py-3 text-gray-700 placeholder:text-gray-400 
                      focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all hover:border-primary-300
                      bg-white/50 hover:bg-white`}
                      value={password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      onBlur={(e) => {
                        if (!validateField('password', e.target.value)) {
                          toast.warning('Mật khẩu phải có ít nhất 6 ký tự');
                        }
                      }}
                      placeholder="Tối thiểu 6 ký tự"
                      required
                    />
                  </div>
                  {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                </div>

                {/* Terms and Conditions */}
                <div className="flex items-start animate-slide-up" style={{animationDelay: '500ms'}}>
                  <div className="flex items-center h-5">
                    <input
                      id="terms"
                      name="terms"
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      required
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="terms" className="text-gray-600">
                      Tôi đồng ý với <a href="#" className="text-primary-600 hover:text-primary-500 underline">Điều khoản sử dụng</a> và <a href="#" className="text-primary-600 hover:text-primary-500 underline">Chính sách bảo mật</a>
                    </label>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4 animate-slide-up" style={{animationDelay: '600ms'}}>
                  <button
                    type="submit"
                    className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl text-base 
                    font-medium text-white transition-all duration-300
                    ${loading
                      ? 'bg-blue-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-subtle hover:shadow-glow'
                    }`}
                    disabled={loading}
                  >
                    {loading && <Spinner />}
                    {loading ? 'Đang xử lý...' : 'Đăng ký'}
                  </button>
                </div>
              </form>
            )}

            {/* Link đăng nhập */}
            <p className="mt-6 text-center text-sm text-gray-600 animate-slide-up" style={{animationDelay: '700ms'}}>
              {successful ? (
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                  Đi đến trang đăng nhập
                </Link>
              ) : (
                <>
                  Đã có tài khoản?{' '}
                  <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 transition-colors">
                    Đăng nhập
                  </Link>
                </>
              )}
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

export default RegisterPage;