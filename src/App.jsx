// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';
import { ChatBubbleLeftEllipsisIcon, ArrowLeftIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ToastProvider from './contexts/ToastContext';
import { ChatProvider } from './contexts/ChatContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';

import './App.css'
import './index.css'; // Import CSS toàn cục

// Trang 404 đẹp hơn
const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white shadow-card hover:shadow-card-hover transition-shadow duration-300 rounded-2xl p-8 text-center animate-fade-in">
        <div className="flex justify-center mb-8">
          <div className="bg-red-100 p-4 rounded-full">
            <ExclamationTriangleIcon className="h-16 w-16 text-red-500 animate-pulse-slow" />
          </div>
        </div>
        <h1 className="text-4xl font-display font-bold text-dark-700 mb-2">404</h1>
        <h2 className="text-2xl font-display font-semibold text-dark-600 mb-6">Trang không tìm thấy</h2>
        <p className="text-dark-500 text-lg mb-10">
          Xin lỗi, trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.
        </p>
        <Link 
          to="/" 
          className="inline-flex items-center justify-center bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200 shadow-subtle"
        >
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Quay lại trang chủ
        </Link>
      </div>
      <p className="mt-8 text-dark-400 text-sm">
        © {new Date().getFullYear()} Chat AI - Tất cả các quyền được bảo lưu.
      </p>
    </div>
  );
};

// Component để bảo vệ route, yêu cầu login
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    // You could add a loading spinner here
    return <div className="flex justify-center items-center h-screen">Đang tải...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Component xử lý khi đã login mà vào trang login/register
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="flex justify-center items-center h-screen">Đang tải...</div>;
  }
  
  if (isAuthenticated) {
    return <Navigate to="/chat" replace />;
  }
  
  return children;
};

function AppContent() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="App">
      <Routes>
        {/* Các Route công khai (Login, Register) */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            isAuthenticated ? <Navigate to="/chat" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* Route fallback nếu không khớp */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <AuthProvider>
          <ChatProvider>
            <AppContent />
          </ChatProvider>
        </AuthProvider>
      </Router>
    </ToastProvider>
  );
}

export default App;