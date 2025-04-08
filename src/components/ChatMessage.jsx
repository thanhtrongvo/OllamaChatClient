import { memo, useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { ClipboardIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon, UserCircleIcon, CpuChipIcon } from '@heroicons/react/24/solid';
import useTypingEffect from '../hooks/useTypingEffect';

const ChatMessage = memo(({ message, isLoading = false, isLast = false }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [thinkingCollapsed, setThinkingCollapsed] = useState(true);
  const [shouldUseTypingEffect, setShouldUseTypingEffect] = useState(false);
  const messageRef = useRef(null);
  
  // Safely extract role and content from message
  const messageRole = typeof message.role === 'string' ? message.role.toLowerCase() : 'assistant';
  const isUser = messageRole === 'user';
  
  // Get message content
  const messageContent = getMessageContent();
  
  // Typing effect hook - sử dụng cho tin nhắn AI mới nhất đang được stream
  const { 
    displayText, 
    isTyping,
    contentType, 
    progress,
    completeTyping 
  } = useTypingEffect(messageContent, {
    speed: 20, // Tốc độ cơ bản
    startTyping: shouldUseTypingEffect && isLast && !isUser,
    showCursor: false,
    batchSize: 12,  // Kích thước batch lớn hơn để mượt mà hơn
    useChunkedRendering: true,
    smartSpeed: true // Sử dụng tốc độ thông minh theo loại nội dung
  });

  // Phát hiện khi nào người dùng cuộn tin nhắn
  useEffect(() => {
    const handleScroll = () => {
      // Nếu người dùng đang cuộn và đang có hiệu ứng đánh chữ, hãy hiển thị toàn bộ nội dung ngay lập tức
      if (shouldUseTypingEffect && isTyping && progress > 0.1) {
        completeTyping();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [shouldUseTypingEffect, isTyping, progress, completeTyping]);

  // Quyết định khi nào sử dụng typing effect (chỉ cho tin nhắn AI và tin nhắn mới nhất)
  useEffect(() => {
    if (isLast && !isUser && isLoading) {
      setShouldUseTypingEffect(true);
    }
  }, [isLast, isUser, isLoading]);
  
  // Safely get thinking content as string
  const getThinkingContent = () => {
    // First prioritize the 'think' property if it exists
    if (message.think && typeof message.think === 'string') {
      return message.think;
    }
    
    // If there's no think content but thinking flag is true, return a placeholder
    if (message.thinking === true) {
      return 'Đang suy nghĩ...';
    }
    
    // Default empty string
    return '';
  };
  
  // Check if message has thinking content
  const hasThinking = message.thinking || (getThinkingContent() !== '');

  // Safely convert content to string
  function getMessageContent() {
    // Handle null or undefined content
    if (message.content === null || message.content === undefined) {
      return '';
    }
    
    // If content is already a string, return it
    if (typeof message.content === 'string') {
      return message.content;
    }
    
    // Try to convert content to string
    try {
      return String(message.content);
    } catch (e) {
      console.error('Could not convert message content to string:', e);
      return '';
    }
  }

  const formatThinkingTime = (ms) => {
    if (!ms || ms < 100) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)} giây`;
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Render the message content
  const renderContent = () => {
    // Loading state for AI
    if (isLoading && !isUser && !message.content) {
      return (
        <div className="flex items-center space-x-2 py-2">
          <div className="h-2 w-2 bg-indigo-400 rounded-full animate-bounce"></div>
          <div className="h-2 w-2 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
          <div className="h-2 w-2 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
        </div>
      );
    }

    // User messages are plain text
    if (isUser) {
      return <div className="whitespace-pre-wrap leading-relaxed">{messageContent}</div>;
    }
    
    // Quyết định xem có sử dụng typing effect hay không
    const shouldShowTypingEffect = shouldUseTypingEffect && isLast && isLoading;
    const contentToDisplay = shouldShowTypingEffect ? displayText : messageContent;
    
    // AI messages use Markdown
    return (
      <div 
        className="relative prose prose-slate prose-a:text-indigo-600 prose-headings:text-slate-800 prose-headings:font-bold prose-p:my-2 max-w-full" 
        ref={messageRef}
      >
        <ReactMarkdown
          className="markdown-content break-words"
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            code({ node, inline, className, children, ...props }) {
              const code = String(children).replace(/\n$/, '');
              const match = /language-(\w+)/.exec(className || '');

              if (!inline && match) {
                return (
                  <div className="rounded-lg overflow-hidden my-3 bg-slate-800 border border-slate-700 shadow-lg transition-all hover:shadow-xl w-full">
                    <div className="flex justify-between items-center px-2 sm:px-4 py-1.5 bg-slate-700 text-xs text-slate-300 font-mono">
                      <span className="font-medium truncate">{match[1]}</span>
                      <button
                        onClick={() => handleCopyCode(code)}
                        className="bg-slate-600 hover:bg-slate-500 transition-colors rounded px-1.5 sm:px-2 py-1 flex items-center flex-shrink-0 ml-2"
                        aria-label="Copy code"
                      >
                        {copiedCode ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5 mr-1 text-green-400" />
                            <span className="text-xs">Copied</span>
                          </>
                        ) : (
                          <>
                            <ClipboardIcon className="h-3.5 w-3.5 mr-1" />
                            <span className="text-xs">Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="overflow-x-auto max-w-full scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                      <pre className="p-2 sm:p-4 text-xs sm:text-sm">
                        <code className={`${className} text-slate-50 whitespace-pre break-normal`} {...props}>
                          {code}
                        </code>
                      </pre>
                    </div>
                  </div>
                );
              }
              return (
                <code
                  className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-indigo-600 text-xs sm:text-sm break-all"
                  {...props}
                >
                  {children}
                </code>
              );
            },
            // Các component khác giữ nguyên
            h1: ({ children }) => (
              <h1 className="text-xl font-bold mt-6 mb-4 pb-2 border-b border-slate-200">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg font-bold mt-5 mb-3">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold mt-4 mb-2">{children}</h3>
            ),
            p: ({ children }) => (
              <p className="my-2 leading-relaxed">{children}</p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="mb-1">{children}</li>
            ),
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-indigo-300 bg-indigo-50 pl-4 py-2 italic my-4 rounded-r">{children}</blockquote>
            ),
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-indigo-600 hover:text-indigo-800 hover:underline transition-colors inline-flex items-center"
              >
                {children}
                {href && href.startsWith('http') && (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 ml-1 inline-block" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                  </svg>
                )}
              </a>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto w-full my-6 rounded-lg shadow">
                <table className="min-w-full border border-slate-200 rounded-lg bg-white table-auto">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-slate-100 border-b border-slate-200">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-slate-200">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-slate-50 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children, align }) => {
              const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
              return (
                <th className={`px-4 py-3 text-xs font-medium text-slate-700 uppercase tracking-wider ${alignClass}`}>
                  {children}
                </th>
              );
            },
            td: ({ children, align }) => {
              const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';
              return (
                <td className={`px-4 py-3 text-sm border-t border-slate-200 ${alignClass}`}>
                  {children}
                </td>
              );
            },
            img: ({ src, alt }) => (
              <img 
                src={src} 
                alt={alt || ''} 
                className="max-w-full h-auto my-4 rounded-lg shadow-sm" 
                loading="lazy"
              />
            ),
            hr: () => (
              <hr className="my-6 border-t border-slate-200" />
            ),
          }}
        >
          {contentToDisplay}
        </ReactMarkdown>
        
        {/* Hiển thị con trỏ đánh chữ có animation */}
        {shouldShowTypingEffect && isTyping && (
          <span className="inline-block ml-1 h-4 w-0.5 bg-indigo-600 animate-cursor-blink" />
        )}
      </div>
    );
  };

  return (
    <div className={`px-2 sm:px-4 py-2 group ${isUser ? 'flex justify-end' : 'flex justify-start'}`}>
      <div className={`flex max-w-[90%] sm:max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar for AI and User */}
        <div
          className={`flex-shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center text-white ${
            isUser
              ? 'bg-gradient-to-br from-indigo-500 to-purple-700 ml-3 shadow-lg shadow-indigo-500/20'
              : 'bg-gradient-to-br from-teal-400 to-cyan-600 mr-3 shadow-lg shadow-cyan-500/20'
          } transition-transform duration-200 group-hover:scale-110`}
        >
          {isUser ? (
            <UserCircleIcon className="h-7 w-7 text-white/90" />
          ) : (
            <CpuChipIcon className="h-7 w-7 text-white/90" />
          )}
        </div>

        {/* Message bubble */}
        <div
          className={`relative px-3 sm:px-5 py-3 sm:py-4 rounded-2xl transition-all duration-200 ${
            isUser
              ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-indigo-500/20 hover:shadow-xl hover:shadow-indigo-500/30'
              : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-md hover:shadow-lg'
          }`}
        >
          {/* Thinking process display for AI */}
          {!isUser && hasThinking && (
            <div className="mb-3">
              <button 
                onClick={() => setThinkingCollapsed(!thinkingCollapsed)}
                className={`text-indigo-600 bg-indigo-50 hover:bg-indigo-100 font-medium rounded-lg text-xs px-2 sm:px-3 py-1 inline-flex items-center cursor-pointer transition-colors ${isLoading && message.thinking ? "animate-pulse bg-indigo-100" : ""}`}
              >
                <LightBulbIcon className="h-3 sm:h-3.5 w-3 sm:w-3.5 mr-1" />
                <span className="truncate">
                  {isLoading && message.thinking ? 'Đang suy nghĩ...' : 'Quá trình suy nghĩ'}
                  {message.thinkingTime ? ` (${formatThinkingTime(message.thinkingTime)})` : ''}
                </span>
                {thinkingCollapsed ? 
                  <ChevronDownIcon className="ml-1 h-3 sm:h-3.5 w-3 sm:w-3.5 flex-shrink-0" /> : 
                  <ChevronUpIcon className="ml-1 h-3 sm:h-3.5 w-3 sm:w-3.5 flex-shrink-0" />
                }
              </button>
              
              {!thinkingCollapsed && (
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 mt-2 mb-3 text-sm border-l-2 border-indigo-300 pl-2 sm:pl-3 py-2 rounded-r-md overflow-auto max-h-40 sm:max-h-60 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-50">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 break-words">
                    {getThinkingContent()}
                  </pre>
                </div>
              )}
            </div>
          )}

          {renderContent()}

          {/* Show spinner when loading */}
          {isLoading && !isUser && (
            <div className="mt-2">
              <div className="inline-block h-4 w-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="animate-spin h-4 w-4 text-indigo-400" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            </div>
          )}

          {/* Display timestamp if any */}
          {message.timestamp && (
            <div className={`text-xs mt-1.5 mx-1 ${
                isUser 
                  ? 'text-indigo-100 bg-gradient-to-r from-indigo-600/20 to-transparent px-2 py-0.5 rounded-full backdrop-blur-sm w-fit ml-auto'
                  : 'text-slate-400'
              } flex justify-end`}
            >
              {new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ChatMessage;