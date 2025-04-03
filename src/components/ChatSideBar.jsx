// src/components/ChatSidebar.jsx
import React, { useState } from 'react';
import { PlusIcon, TrashIcon, ChatBubbleLeftRightIcon, ArrowRightIcon, Cog6ToothIcon, ArrowLeftCircleIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftEllipsisIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import useToast from '../hooks/useToast';

function ChatSidebar({
  chats = [],
  selectedChatId,
  onSelectChat,
  onCreateNewChat,
  onDeleteChat,
  className = ""
}) {
  const [hoveredChat, setHoveredChat] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [pendingDeleteChatId, setPendingDeleteChatId] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { logout, user } = useAuth();
  const { isTyping } = useChat();
  const toast = useToast();

  // Hàm tạo văn bản rút gọn với dấu chấm lửng
  const truncateText = (text, maxLength = 25) => {
    if (!text) return 'Cuộc trò chuyện mới';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Lấy thời gian từ ngày
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Hôm nay';
    } else if (diffDays === 1) {
      return 'Hôm qua';
    } else if (diffDays < 7) {
      return `${diffDays} ngày trước`;
    } else {
      return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
    }
  };

  // Hiển thị hộp thoại xác nhận đăng xuất
  const promptLogout = () => {
    // Nếu AI đang xử lý, hiển thị toast thông báo
    if (isTyping) {
      toast.warning("Không thể đăng xuất khi AI đang xử lý. Vui lòng đợi xử lý hoàn tất.");
      return;
    }
    
    // Hiện toast xác nhận thay vì window.confirm
    toast.info(
      "Bạn có chắc chắn muốn đăng xuất không?", 
      10000, // Hiển thị lâu hơn để người dùng có thời gian xác nhận
    );
    setShowLogoutConfirm(true);
  };

  // Thực hiện đăng xuất
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
      toast.success("Đăng xuất thành công!");
    } catch (error) {
      toast.error("Đăng xuất thất bại, vui lòng thử lại.");
      setIsLoggingOut(false);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  // Huỷ đăng xuất
  const cancelLogout = () => {
    setShowLogoutConfirm(false);
    toast.info("Đã huỷ đăng xuất.");
  };

  // Hiện hộp xác nhận xóa chat
  const promptDeleteChat = (chatId) => {
    // Nếu AI đang xử lý, hiển thị toast thông báo
    if (isTyping) {
      toast.warning("Không thể xóa chat khi AI đang xử lý. Vui lòng đợi xử lý hoàn tất.");
      return;
    }
    
    // Make sure chatId is a number
    const numericChatId = Number(chatId);
    const chatToDelete = chats.find(chat => chat.id === numericChatId);
    const chatTitle = chatToDelete?.title || 'cuộc trò chuyện này';
    
    // Hiển thị toast xác nhận thay vì window.confirm
    toast.warning(
      <div className="flex flex-col">
        <div className="flex items-center mb-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
          <span className="font-medium">Xác nhận xóa</span>
        </div>
        <p className="mb-3">Bạn có chắc muốn xóa "{truncateText(chatTitle, 50)}" không?</p>
        <div className="flex space-x-2 justify-end mt-1">
          <button 
            onClick={() => confirmDeleteChat(numericChatId)} 
            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs transition-colors"
          >
            Xóa
          </button>
          <button 
            onClick={cancelDeleteChat}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs transition-colors"
          >
            Hủy
          </button>
        </div>
      </div>, 
      15000
    );
    
    setPendingDeleteChatId(numericChatId);
  };
  
  // Xác nhận xóa chat
  const confirmDeleteChat = async (chatId) => {
    try {
      setIsDeleting(true);
      console.log("Deleting chat with ID:", chatId);
      onDeleteChat(chatId);
      toast.success("Đã xóa cuộc trò chuyện thành công!");
    } catch (error) {
      toast.error("Không thể xóa cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setPendingDeleteChatId(null);
      setIsDeleting(false);
    }
  };
  
  // Hủy xóa chat
  const cancelDeleteChat = () => {
    setPendingDeleteChatId(null);
    toast.info("Đã hủy xóa cuộc trò chuyện.");
  };

  // Hàm xử lý click vào chat để chuyển đổi
  const handleSelectChat = (chatId) => {
    // Nếu AI đang suy nghĩ, hiển thị toast thông báo thay vì alert
    if (isTyping) {
      toast.warning("Không thể chuyển chat khi AI đang xử lý. Vui lòng đợi xử lý hoàn tất.");
      return;
    }
    
    // Nếu không thì chuyển sang chat đó
    onSelectChat(chatId);
  };

  // Hàm xử lý tạo chat mới
  const handleCreateNewChat = () => {
    // Nếu AI đang suy nghĩ, hiển thị toast thông báo thay vì alert
    if (isTyping) {
      toast.warning("Không thể tạo chat mới khi AI đang xử lý. Vui lòng đợi xử lý hoàn tất.");
      return;
    }
    
    // Nếu không thì tạo chat mới
    onCreateNewChat();
    toast.success("Đã tạo cuộc trò chuyện mới!");
  };

  return (
    <div className={`flex flex-col h-full bg-gray-900 text-white ${className}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-800 bg-gray-800 shadow-md">
        <div className="flex items-center">
          <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-indigo-400 mr-2" />
          <h2 className="text-lg font-semibold">Chat AI</h2>
        </div>
        <button 
          className="p-1.5 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition-colors" 
          title="Cài đặt"
        >
          
        </button>
      </div>

      {/* User info */}
      {user && (
        <div className="px-4 py-3 bg-gray-800 border-b border-gray-700 text-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-medium">
                {user.username ? user.username.substring(0, 1).toUpperCase() : "U"}
              </div>
              <div className="ml-2">
                <div className="font-medium text-gray-200">{user.username}</div>
                <div className="text-xs text-gray-400 truncate">
                  {user.email || 'Người dùng Chat AI'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nút tạo chat mới */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={handleCreateNewChat} // Sử dụng hàm mới để xử lý tạo chat
          disabled={isTyping}
          className={`w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-lg shadow-md text-sm font-medium text-white 
            ${isTyping 
              ? 'bg-indigo-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500'} 
            transition-colors duration-150`}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Tạo cuộc trò chuyện mới
          {isTyping && <span className="ml-2 text-xs">(AI đang xử lý...)</span>}
        </button>
      </div>

      {/* Danh sách chat */}
      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        <div className="px-3 py-4">
          <h3 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Cuộc trò chuyện của bạn
          </h3>
          
          <nav className="space-y-1">
            {chats.length === 0 && (
              <div className="text-center py-4 text-gray-500 text-sm">
                <ChatBubbleLeftRightIcon className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                <p>Chưa có cuộc trò chuyện nào</p>
                <p className="mt-1">Hãy tạo cuộc trò chuyện mới!</p>
              </div>
            )}
            
            {chats.map((chat) => (
              <div 
                key={chat.id} 
                className={`group relative flex items-center justify-between px-2 py-3 text-sm rounded-md 
                  ${selectedChatId === chat.id 
                    ? 'bg-indigo-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'} 
                  ${isTyping ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                onClick={() => handleSelectChat(chat.id)}
                onMouseEnter={() => setHoveredChat(chat.id)}
                onMouseLeave={() => setHoveredChat(null)}
              >
                <div className="flex items-center flex-grow min-w-0">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    selectedChatId === chat.id ? 'bg-indigo-700' : 'bg-gray-700'
                  }`}>
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  </div>
                  <div className="ml-3 flex-grow min-w-0">
                    <div className="truncate font-medium">
                      {truncateText(chat.title)}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {formatDate(chat.lastUpdated || chat.createdAt)}
                    </div>
                  </div>
                </div>
                
                {/* Nút xóa khi hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    promptDeleteChat(chat.id);
                  }}
                  disabled={isTyping || isDeleting || pendingDeleteChatId === chat.id}
                  className={`transition-all ${
                    hoveredChat === chat.id ? 'opacity-100' : 'opacity-0'
                  } ${
                    isTyping || isDeleting || pendingDeleteChatId === chat.id
                      ? 'text-gray-500 cursor-not-allowed' 
                      : 'text-gray-400 hover:text-red-500'
                  }`}
                  title={isTyping ? "Không thể xóa khi AI đang xử lý" : "Xóa cuộc trò chuyện"}
                >
                  <TrashIcon className="h-4.5 w-4.5" />
                  {pendingDeleteChatId === chat.id && isDeleting && (
                    <span className="sr-only">Đang xóa...</span>
                  )}
                </button>
                
                {/* Indicator khi selected */}
                {selectedChatId === chat.id && (
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 -mr-1">
                    <ArrowRightIcon className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-800 bg-gray-800">
        <div className="flex justify-between items-center">
          <p className="text-xs text-gray-500">Được phát triển bởi Thanh Trọng</p>
          
          {/* Hiển thị nút đăng xuất hoặc nút xác nhận/huỷ */}
          {showLogoutConfirm ? (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
                title="Xác nhận đăng xuất"
              >
                {isLoggingOut ? (
                  <span className="flex items-center">
                    <svg className="animate-spin h-3 w-3 mr-1 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </span>
                ) : (
                  "Xác nhận"
                )}
              </button>
              <button
                onClick={cancelLogout}
                disabled={isLoggingOut}
                className="flex items-center text-xs border border-gray-600 text-gray-300 px-2 py-1 rounded hover:bg-gray-700 transition-colors"
                title="Huỷ đăng xuất"
              >
                Huỷ
              </button>
            </div>
          ) : (
            <button
              onClick={promptLogout}
              disabled={isTyping || isLoggingOut}
              className={`flex items-center text-xs transition-colors ${
                isTyping 
                  ? 'text-gray-500 cursor-not-allowed' 
                  : 'text-gray-400 hover:text-white'
              }`}
              title={isTyping ? "Không thể đăng xuất khi AI đang xử lý" : "Đăng xuất"}
            >
              <ArrowLeftCircleIcon className="h-4 w-4 mr-1" />
              Đăng xuất
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ChatSidebar;