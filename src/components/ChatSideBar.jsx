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
    
    // Lưu ID chat cần xóa để xử lý UI
    setPendingDeleteChatId(numericChatId);
    
    // Sử dụng confirm thường thay vì toast phức tạp
    if (window.confirm(`Bạn có chắc muốn xóa "${truncateText(chatTitle, 50)}" không?`)) {
      confirmDeleteChat(numericChatId);
    } else {
      cancelDeleteChat();
    }
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
          <h2 className="text-lg font-semibold">Pikoes Chat</h2>
        </div>
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
          className={`w-full flex items-center justify-center px-4 py-3 border border-transparent rounded-lg shadow-md text-sm font-medium text-white 
            ${isTyping 
              ? 'bg-indigo-400 cursor-not-allowed' 
              : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-500'} 
            transition-colors duration-150`}
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          <span className="whitespace-nowrap">Tạo cuộc trò chuyện mới</span>
          {isTyping && <span className="ml-2 text-xs">(AI đang xử lý...)</span>}
        </button>
      </div>

      {/* Danh sách chat */}
      <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        <div className="px-3 py-4">
          <h3 className="px-2 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Cuộc trò chuyện của bạn
          </h3>
          
          <nav className="space-y-2">
            {chats.length === 0 && (
              <div className="text-center py-5 text-gray-500 text-sm">
                <ChatBubbleLeftRightIcon className="h-10 w-10 mx-auto mb-2 text-gray-600" />
                <p>Chưa có cuộc trò chuyện nào</p>
                <p className="mt-1">Hãy tạo cuộc trò chuyện mới!</p>
              </div>
            )}
            
            {chats.map((chat) => (
              <div 
                key={chat.id} 
                className={`group relative flex items-center justify-between px-3 py-3.5 text-sm rounded-md 
                  ${selectedChatId === chat.id 
                    ? 'bg-indigo-900 text-white' 
                    : 'text-gray-300 hover:bg-gray-800'} 
                  ${isTyping ? 'cursor-not-allowed' : 'cursor-pointer'}
                  touch-manipulation`}
                onClick={() => handleSelectChat(chat.id)}
                onMouseEnter={() => setHoveredChat(chat.id)}
                onMouseLeave={() => setHoveredChat(null)}
                role="button"
                tabIndex="0"
              >
                <div className="flex items-center flex-grow min-w-0">
                  <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    selectedChatId === chat.id ? 'bg-indigo-700' : 'bg-gray-700'
                  }`}>
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                  </div>
                  <div className="ml-3 flex-grow min-w-0">
                    <div className="truncate font-medium">
                      {truncateText(chat.title, window.innerWidth < 640 ? 20 : 25)}
                    </div>
                    <div className="text-xs text-gray-400 truncate">
                      {formatDate(chat.lastUpdated || chat.createdAt)}
                    </div>
                  </div>
                </div>
                
                {/* Nút xóa khi hover hoặc touch trên mobile */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    promptDeleteChat(chat.id);
                  }}
                  disabled={isTyping || isDeleting || pendingDeleteChatId === chat.id}
                  className={`transition-all p-2 ${
                    hoveredChat === chat.id 
                      ? 'opacity-100' 
                      : 'opacity-0 md:opacity-0 md:group-hover:opacity-100'
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
          <p className="text-xs text-gray-500">Được phát triển với mục đích thử nghiệm ❤️</p>
          
          
        </div>
      </div>
    </div>
  );
}

export default ChatSidebar;