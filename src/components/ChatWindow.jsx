// src/components/ChatWindow.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import ChatMessage from './ChatMessage';
import { 
  PaperAirplaneIcon, 
  StopIcon, 
  ArrowPathIcon, 
  ChatBubbleLeftRightIcon,
  CpuChipIcon,
  LightBulbIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/solid';
import { ClockIcon } from '@heroicons/react/24/outline';
import Spinner from './Spinner';

function ChatWindow({
  messages = [],
  onSendMessage,
  isLoading = false,
  isAiResponding = false,
  isSending = false,
  onAbort = () => {},
  currentModel = "Model not selected",
  thinkingContent = "",
  selectedChatId,
  onScrollToBottom
}) {
  const [inputMessage, setInputMessage] = useState('');
  const [lastSentMessage, setLastSentMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [thinkingStartTime, setThinkingStartTime] = useState(null);
  const [elapsedThinkingTime, setElapsedThinkingTime] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const chatInputRef = useRef(null);
  const [textareaHeight, setTextareaHeight] = useState(56); // Default height
  const messagesContainerRef = useRef(null);
  const lastScrollPositionRef = useRef(0);
  const lastMessagesLengthRef = useRef(0);
  
  // Kiểm tra tin nhắn bị lỗi
  const isLastMessageError = () => {
    if (!messages || messages.length === 0) return false;
    
    const lastMessage = messages[messages.length - 1];
    return lastMessage.role === 'ASSISTANT' && 
           (lastMessage.content.includes("Xin lỗi, tôi không thể tạo") || 
            lastMessage.content.includes("Rất tiếc, tin nhắn này có định dạng không hợp lệ") ||
            lastMessage.content.includes("Sorry, I couldn't generate a proper response"));
  };

  // Tự động cuộn xuống khi có tin nhắn mới - với hiệu suất tối ưu
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      // Sử dụng IntersectionObserver thay vì scrollIntoView để tăng hiệu suất
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry.isIntersecting) {
              const behavior = smooth ? "smooth" : "auto";
              messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
            }
            // Ngắt kết nối observer sau khi sử dụng
            observer.disconnect();
          },
          { threshold: 1.0 }
        );
        
        observer.observe(messagesEndRef.current);
        // Đảm bảo kết quả thực hiện ngay nếu không sử dụng smooth scrolling
        if (!smooth) {
          observer.disconnect();
          messagesEndRef.current.scrollIntoView({ behavior: "auto", block: "end" });
        }
      } else {
        // Fallback cho trình duyệt không hỗ trợ IntersectionObserver
        const behavior = smooth ? "smooth" : "auto";
        messagesEndRef.current.scrollIntoView({ behavior, block: "end" });
      }
      if (onScrollToBottom) onScrollToBottom();
    }
  }, [onScrollToBottom]);
  
  // Thực hiện cuộn tối ưu dựa trên thay đổi tin nhắn
  useEffect(() => {
    // Chỉ cuộn tự động khi:
    // 1. Số lượng tin nhắn tăng lên
    // 2. Đang ở cuối chat
    // 3. Đang có phản hồi từ AI
    
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;
    
    const isAtBottom = () => {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
      // Được xem là ở cuối nếu khoảng cách đến cuối < 100px
      return scrollHeight - scrollTop - clientHeight < 100;
    };
    
    const wasAtBottom = isAtBottom();
    const messageCountChanged = messages.length !== lastMessagesLengthRef.current;
    lastMessagesLengthRef.current = messages.length;
    
    // Nếu đang ở cuối hoặc số lượng tin nhắn thay đổi và AI đang phản hồi
    if ((wasAtBottom || messageCountChanged) && (isAiResponding || isLoading)) {
      // Đặt timeout để đảm bảo DOM đã cập nhật
      setTimeout(() => scrollToBottom(wasAtBottom), 10);
    }
  }, [messages, isLoading, thinkingContent, isAiResponding, scrollToBottom]);

  // Lưu vị trí cuộn
  useEffect(() => {
    const messagesContainer = messagesContainerRef.current;
    if (!messagesContainer) return;
    
    const handleScroll = () => {
      lastScrollPositionRef.current = messagesContainer.scrollTop;
    };
    
    messagesContainer.addEventListener('scroll', handleScroll);
    return () => messagesContainer.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Theo dõi thời gian suy nghĩ
  useEffect(() => {
    if (isAiResponding) {
      if (!thinkingStartTime) {
        setThinkingStartTime(Date.now());
      }
      
      const intervalId = setInterval(() => {
        if (thinkingStartTime) {
          setElapsedThinkingTime(Date.now() - thinkingStartTime);
        }
      }, 500); // Giảm tần suất cập nhật xuống 0.5 giây để giảm tải rendering
      
      return () => clearInterval(intervalId);
    } else {
      setThinkingStartTime(null);
      setElapsedThinkingTime(0);
    }
  }, [isAiResponding, thinkingStartTime]);

  // Format thời gian suy nghĩ của AI
  const formatThinkingTime = (ms) => {
    if (!ms || ms < 100) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)} giây`;
  };

  // Xử lý gửi tin nhắn
  const handleSendMessage = useCallback((e) => {
    e.preventDefault();
    if (inputMessage.trim() && !isAiResponding && !isSending) {
      setLastSentMessage(inputMessage.trim());
      onSendMessage(inputMessage.trim());
      setInputMessage('');
      setTextareaHeight(56); // Reset height after sending
      setShowSuggestions(false);
      // Force scroll to bottom without animation khi gửi tin nhắn mới
      setTimeout(() => scrollToBottom(false), 50);
    }
  }, [inputMessage, isAiResponding, isSending, onSendMessage, scrollToBottom]);
  
  // Xử lý gửi lại tin nhắn cuối
  const handleResendLastMessage = useCallback(() => {
    if (lastSentMessage && !isAiResponding && !isSending) {
      onSendMessage(lastSentMessage);
    }
  }, [lastSentMessage, isAiResponding, isSending, onSendMessage]);

  // Xử lý khi nhấn Enter gửi tin nhắn
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  // Tự động điều chỉnh chiều cao của textarea
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    // Tự động điều chỉnh chiều cao
    e.target.style.height = 'auto';
    const newHeight = Math.min(Math.max(e.target.scrollHeight, 56), 180);
    setTextareaHeight(newHeight);
    e.target.style.height = `${newHeight}px`;
  };

  // Các gợi ý nhanh
  const suggestions = [
    "Viết email chuyên nghiệp về...",
    "Giải thích khái niệm về...",
    "Phân tích ưu nhược điểm của...",
    "Viết đoạn mã để..."
  ];

  // Xử lý khi chọn gợi ý
  const handleSuggestionClick = (text) => {
    setInputMessage(text);
    setShowSuggestions(false);
    if (chatInputRef.current) {
      chatInputRef.current.focus();
    }
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Phần tin nhắn với thiết kế nâng cao */}
      <div 
        className="flex-1 overflow-auto p-4 md:p-6 space-y-6"
        ref={messagesContainerRef}
      >
        {/* Thông báo chưa chọn chat */}
        {!selectedChatId && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-8 rounded-2xl bg-white/80 backdrop-blur-sm shadow-xl max-w-lg transition-all hover:shadow-2xl">
              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white p-4 rounded-xl inline-block mb-5">
                <ChatBubbleLeftRightIcon className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-slate-800">Bắt đầu một cuộc trò chuyện</h2>
              <p className="text-slate-600 mb-6 leading-relaxed">
                Chọn một chat từ danh sách hoặc tạo cuộc trò chuyện mới để bắt đầu tương tác với AI. Hãy đặt câu hỏi và khám phá khả năng của trí tuệ nhân tạo!
              </p>
              <div className="inline-flex items-center text-indigo-600 font-medium text-sm">
                <ArrowDownTrayIcon className="h-5 w-5 mr-2 animate-bounce" />
                <span>Chọn hoặc tạo chat mới từ thanh bên</span>
              </div>
            </div>
          </div>
        )}

        {/* Danh sách tin nhắn */}
        {selectedChatId && (
          <div className="space-y-8 flex-1 flex flex-col">
            {messages.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="w-full max-w-lg mx-auto p-8 rounded-2xl bg-white shadow-xl transition-all hover:shadow-2xl border border-indigo-50" style={{maxHeight: '80vh'}}>
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-5 rounded-xl inline-flex justify-center items-center mb-6 shadow-lg">
                    <CpuChipIcon className={`h-14 w-14 text-white ${isAiResponding || isLoading ? 'animate-pulse' : ''}`} />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-800">
                    {isAiResponding || isLoading ? "AI đang xử lý..." : "Cuộc trò chuyện mới"}
                  </h3>
                  <p className="text-gray-600 mb-6">
                    {isAiResponding || isLoading 
                      ? "Tin nhắn của bạn đang được xử lý, vui lòng đợi trong giây lát..."
                      : "Bắt đầu cuộc trò chuyện với AI bằng cách gửi tin nhắn bên dưới!"}
                  </p>
                  {!(isAiResponding || isLoading) && (
                    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-5 border border-indigo-100 shadow-sm">
                      <div className="flex items-center mb-3">
                        <LightBulbIcon className="h-5 w-5 text-amber-500 mr-2" />
                        <h4 className="font-semibold text-indigo-800">Gợi ý:</h4>
                      </div>
                      <ul className="space-y-2 text-left">
                        <li className="flex items-start">
                          <span className="inline-block h-5 w-5 bg-indigo-100 rounded-full flex-shrink-0 flex items-center justify-center text-indigo-600 mr-2 text-xs font-bold">1</span>
                          <span className="text-gray-700">Hỏi về một chủ đề bạn quan tâm</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-block h-5 w-5 bg-indigo-100 rounded-full flex-shrink-0 flex items-center justify-center text-indigo-600 mr-2 text-xs font-bold">2</span>
                          <span className="text-gray-700">Tìm kiếm giải thích cho một khái niệm phức tạp</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-block h-5 w-5 bg-indigo-100 rounded-full flex-shrink-0 flex items-center justify-center text-indigo-600 mr-2 text-xs font-bold">3</span>
                          <span className="text-gray-700">Yêu cầu viết mã hoặc giải quyết vấn đề</span>
                        </li>
                        <li className="flex items-start">
                          <span className="inline-block h-5 w-5 bg-indigo-100 rounded-full flex-shrink-0 flex items-center justify-center text-indigo-600 mr-2 text-xs font-bold">4</span>
                          <span className="text-gray-700">Nhờ giúp đỡ với một dự án cụ thể</span>
                        </li>
                      </ul>
                    </div>
                  )}
                  {(isAiResponding || isLoading) && (
                    <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-5 border border-indigo-100 shadow-sm">
                      <div className="flex items-center justify-center">
                        <span className="inline-block h-3 w-3 rounded-full bg-indigo-600 animate-pulse mr-2"></span> 
                        <span className="text-indigo-700">Đang xử lý... {formatThinkingTime(elapsedThinkingTime)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {messages.map((message, index) => (
                  <ChatMessage 
                    key={message.id || index} 
                    message={message} 
                    isLoading={(isAiResponding || isLoading) && index === messages.length - 1 && message.role === 'ASSISTANT'}
                    isLast={index === messages.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        
        
        {/* Hiển thị nút "Gửi lại" khi có tin nhắn lỗi - với thiết kế nâng cao */}
        {isLastMessageError() && !isAiResponding && !isSending && lastSentMessage && (
          <div className="flex justify-center mt-6 mb-4 scale-in-center">
            <button 
              onClick={handleResendLastMessage}
              className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-full hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg"
            >
              <ArrowPathIcon className="h-4 w-4 mr-2" />
              <span>Gửi lại tin nhắn</span>
            </button>
          </div>
        )}

        {/* Điểm cuối cuộc trò chuyện để cuộn tới */}
        <div ref={messagesEndRef} />
      </div>

      {/* Form nhập tin nhắn với thiết kế nâng cao */}
      <div className="border-t border-indigo-100 bg-white p-4 md:px-8 md:py-6 shadow-[0_-1px_5px_rgba(0,0,0,0.05)]">
        {/* Gợi ý nhanh */}
        {showSuggestions && messages.length === 0 && selectedChatId && (
          <div className="mb-4 flex flex-wrap gap-2 animate-fade-in">
            {suggestions.map((text, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(text)}
                className="text-sm bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 text-indigo-700 rounded-full px-4 py-1.5 hover:bg-indigo-100 transition-colors whitespace-nowrap"
              >
                {text}
              </button>
            ))}
          </div>
        )}
        
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <div className="flex-1 relative">
            <textarea
              ref={chatInputRef}
              rows={1}
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              style={{ height: `${textareaHeight}px` }}
              disabled={!selectedChatId || isAiResponding || isSending}
              placeholder={
                !selectedChatId ? "Vui lòng chọn một chat trước..." :
                isAiResponding ? "Đang chờ phản hồi..." :
                "Nhập tin nhắn của bạn... (Nhấn Enter để gửi, Shift+Enter để xuống dòng)"
              }
              className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 shadow-sm resize-none transition-all bg-slate-50/50 focus:bg-white"
            />

            {/* Nút hủy phản hồi AI khi đang streaming */}
            {isAiResponding && (
              <button
                type="button"
                onClick={onAbort}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center justify-center h-8 w-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                title="Dừng phản hồi"
              >
                <StopIcon className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!inputMessage.trim() || !selectedChatId || isAiResponding || isSending}
            className={`px-5 py-3 rounded-xl text-white flex-shrink-0 flex items-center justify-center transition-all duration-200 ${
              !inputMessage.trim() || !selectedChatId || isAiResponding || isSending
                ? 'bg-slate-400 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 shadow hover:shadow-md hover:shadow-indigo-500/20'
            }`}
          >
            {isSending ? (
              <div className="flex items-center space-x-2">
                <Spinner size="small" color="white" />
                <span>Gửi</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <PaperAirplaneIcon className="h-4 w-4" />
                <span>Gửi</span>
              </div>
            )}
          </button>
        </form>

        {/* Hiển thị model đang được sử dụng - với thiết kế nâng cao */}
        {selectedChatId && currentModel && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between">
            <div className="flex items-center text-xs text-slate-500">
              <CpuChipIcon className="h-3 w-3 mr-1 text-indigo-500" />
              <span>Model: <span className="font-medium">{currentModel}</span></span>
            </div>
            
            <div className="text-xs text-slate-400">
              {messages.length > 0 && `${messages.length} tin nhắn`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ChatWindow;