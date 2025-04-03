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
  BoltIcon
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

  // Phần render của component
  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 hidden md:block border-r border-primary-200 bg-white/80 backdrop-blur-sm shadow-subtle">
        <ChatSidebar
          chats={chatHistory}  // Changed from messages to chatHistory
          selectedChatId={activeChatId}
          onSelectChat={selectChat}
          onCreateNewChat={createNewChat}
          onDeleteChat={deleteChat}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center py-3 px-5 border-b border-primary-200 bg-white/80 backdrop-blur-sm shadow-subtle">
          <div className="flex items-center space-x-4">
            {/* Mobile logo */}
            <div className="md:hidden flex items-center">
              <ChatBubbleLeftEllipsisIcon className="h-6 w-6 text-primary-600 mr-2" />
              <span className="font-display font-semibold text-dark-700">Chat AI</span>
            </div>

            {/* Model selection */}
            <div className="w-48">
              <ModelSelector
                models={availableModels}
                selectedModel={currentModel}
                onSelectModel={handleChangeModel}
                fetchModels={loadAvailableModels}
                className="w-full"
              />
            </div>

              
            
          </div>

          {/* Error message (if any) */}
          {error && (
            <div className="mx-4 px-4 py-2 text-sm text-red-700 bg-red-100 rounded-xl animate-fade-in">
              {error}
            </div>
          )}

         
          {/* Actions */}
          <div>
            <button
              onClick={logout}
              className="flex items-center px-4 py-2 text-sm font-medium text-dark-700 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-colors"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              <span>Đăng xuất</span>
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
      </div>
    </div>
  );
}

export default ChatPage;