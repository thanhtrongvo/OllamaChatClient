// src/pages/ChatPage.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import ChatSidebar from '../components/ChatSideBar';
import ChatWindow from '../components/ChatWindow';
import ModelSelector from '../components/ModelSelector';
import chatService from '../services/chatService';
import { 
  ArrowRightOnRectangleIcon, 
  CursorArrowRippleIcon, 
  CursorArrowRaysIcon,
  ChatBubbleLeftEllipsisIcon,
  Cog6ToothIcon,
  Bars3Icon,
  XMarkIcon,
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';

function ChatPage() {
  // --- Use enhanced ChatContext with models support---
  const { 
    messages, 
    isTyping, 
    error, 
    loadChatHistory, 
    isSaving, 
    activeChatId, 
    chatTitle, 
    sendMessage, 
    dismissError, 
    createNewChat, 
    deleteChat, 
    selectChat,
    availableModels,
    currentModel,
    isLoadingModels,
    loadAvailableModels,
    selectModel,
    chatHistory  // Add this to extract chatHistory from context
  } = useChat();

  const { user, logout } = useAuth();
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [thinkingContent, setThinkingContent] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  
  // Ref để lưu hàm abort stream
  const abortStreamRef = useRef(null);

  const navigate = useNavigate();
  
  // Load chat history khi component được mount
  useEffect(() => {
    // Call loadChatHistory directly once when component mounts
    loadChatHistory();
  }, []); // Remove dependency to prevent infinite loop
  
  // Tải danh sách models từ ChatContext hook thay vì từ modelService
  useEffect(() => {
    loadAvailableModels();
  }, [loadAvailableModels]);
  
  // Theo dõi trạng thái khi gửi tin nhắn và nhận phản hồi
  useEffect(() => {
    if (!isTyping && isSending) {
      setIsSending(false);
    }
    
    setIsAiResponding(isTyping);
  }, [isTyping, isSending]);
  
  // Cập nhật abortStreamRef khi có lỗi
  useEffect(() => {
    if (error) {
      // Reset các trạng thái liên quan khi có lỗi
      setIsSending(false);
      setIsAiResponding(false);
      
      // Tự động ẩn lỗi sau 5 giây
      const timer = setTimeout(() => {
        dismissError();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, dismissError]);

  // Theo dõi thay đổi trong tin nhắn để cập nhật thinking content
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'ASSISTANT' && lastMessage.thinking && lastMessage.think) {
        setThinkingContent(lastMessage.think);
      }
    }
  }, [messages]);

  // Đóng sidebar khi gửi tin nhắn trong chế độ mobile
  useEffect(() => {
    if (isSending && showMobileSidebar) {
      setShowMobileSidebar(false);
    }
  }, [isSending, showMobileSidebar]);

  const handleAbortAiResponse = useCallback(() => { 
    if (abortStreamRef.current) {
      abortStreamRef.current();
      setIsAiResponding(false);
    }
  }, []);

  const handleSendMessage = useCallback((message) => {
    setIsSending(true);
    sendMessage(message);
  }, [sendMessage]);

  const handleChangeModel = useCallback((modelId) => {
    selectModel(modelId);
  }, [selectModel]);

  // Xử lý khi chọn chat trên mobile
  const handleSelectChatMobile = useCallback((chatId) => {
    selectChat(chatId);
    setShowMobileSidebar(false);
  }, [selectChat]);

  // Toggle mobile sidebar
  const toggleMobileSidebar = useCallback(() => {
    setShowMobileSidebar(prev => !prev);
  }, []);

  // Phần render của component
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Desktop Sidebar */}
      <div className="w-72 flex-shrink-0 hidden md:block border-r border-primary-200 bg-white/80 backdrop-blur-sm shadow-subtle">
        <ChatSidebar
          chats={chatHistory}
          selectedChatId={activeChatId}
          onSelectChat={selectChat}
          onCreateNewChat={createNewChat}
          onDeleteChat={deleteChat}
        />
      </div>

      {/* Mobile Sidebar - Absolute positioned over content when open */}
      {showMobileSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity" 
            onClick={toggleMobileSidebar}
          ></div>
          
          {/* Sidebar content */}
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col bg-gray-900">
            <div className="absolute top-0 right-0 pt-4 pr-4 z-10">
              <button
                className="rounded-md text-white hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-white"
                onClick={toggleMobileSidebar}
              >
                <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                <span className="sr-only">Đóng sidebar</span>
              </button>
            </div>
            
            <ChatSidebar
              chats={chatHistory}
              selectedChatId={activeChatId}
              onSelectChat={handleSelectChatMobile}
              onCreateNewChat={() => {
                createNewChat();
                setShowMobileSidebar(false);
              }}
              onDeleteChat={deleteChat}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center py-3 px-5 border-b border-primary-200 bg-white/80 backdrop-blur-sm shadow-subtle">
          <div className="flex items-center space-x-4">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none"
              onClick={toggleMobileSidebar}
              aria-label="Mở menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* Mobile logo */}
            <div className="md:hidden flex items-center">
              <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-primary-600 mr-2" />
              <span className="font-display font-semibold text-dark-700">Chat AI</span>
            </div>

            {/* Model selection button */}
            <button
              onClick={() => setModelSelectorOpen(true)}
              className="flex items-center space-x-2 bg-white rounded-md px-3 py-2 border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <CpuChipIcon className="h-5 w-5 text-indigo-500" />
              <span className="text-sm font-medium truncate max-w-[120px]">
                {availableModels.find(m => m.id === currentModel)?.displayName || currentModel.replace(':', ' ')}
              </span>
            </button>
          </div>

          {/* Error message (if any) */}
          {error && (
            <div className="mx-4 px-4 py-2 text-sm text-red-700 bg-red-100 rounded-xl animate-fade-in max-w-xs sm:max-w-md overflow-hidden text-ellipsis">
              {error}
            </div>
          )}

         
          {/* Actions */}
          <div>
            <button
              onClick={logout}
              className="flex items-center px-2 py-1 sm:px-4 sm:py-2 text-sm font-medium text-dark-700 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Đăng xuất</span>
            </button>
          </div>
        </div>

        {/* Chat Window */}
        <div className="flex-1 overflow-hidden">
          <ChatWindow
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isTyping}
            isAiResponding={isAiResponding}
            isSending={isSending}
            onAbort={handleAbortAiResponse}
            currentModel={currentModel}
            thinkingContent={thinkingContent}
            selectedChatId={activeChatId}
          />
        </div>

        {/* Model Selector Modal */}
        <ModelSelector
          models={availableModels}
          selectedModel={currentModel}
          onSelectModel={handleChangeModel}
          fetchModels={loadAvailableModels}
          isOpen={modelSelectorOpen}
          onClose={() => setModelSelectorOpen(false)}
        />
      </div>
    </div>
  );
}

export default ChatPage;