import { useState, useEffect, useRef } from 'react';

/**
 * Hook tạo hiệu ứng gõ chữ (typing effect) và hiệu ứng loading dots
 * với khả năng tự động điều chỉnh tốc độ và hiển thị mượt mà hơn
 * 
 * @param {string} text - Văn bản cần hiển thị hiệu ứng gõ chữ
 * @param {Object} options - Các tùy chọn cho hiệu ứng
 * @param {boolean} options.isLoading - Trạng thái đang tải hay không
 * @param {number} options.speed - Tốc độ gõ chữ cơ bản (ms)
 * @param {boolean} options.startTyping - Có bắt đầu hiệu ứng ngay lập tức
 * @param {boolean} options.showCursor - Có hiển thị con trỏ nháy
 * @param {number} options.batchSize - Số ký tự hiển thị mỗi lượt
 * @param {boolean} options.useChunkedRendering - Bật/tắt render theo batch
 * @param {boolean} options.smartSpeed - Bật/tắt tính năng điều chỉnh tốc độ thông minh
 * @returns {Object} - Đối tượng chứa văn bản đã hiển thị và trạng thái liên quan
 */
export function useTypingEffect(text = '', options = {}) {
  const {
    isLoading = false,
    speed = 30,  // Giảm thời gian mặc định xuống để tăng tốc độ hiển thị
    startTyping = true,
    showCursor = true,
    batchSize = 8,  // Tăng số ký tự mỗi batch để hiển thị nhanh hơn
    useChunkedRendering = true,
    smartSpeed = true, // Điều chỉnh tốc độ thông minh dựa trên loại nội dung
    smoothScrolling = true // Kích hoạt cuộn mượt mà khi có nhiều nội dung
  } = options;
  
  const [displayText, setDisplayText] = useState('');
  const [dots, setDots] = useState('');
  const [isTyping, setIsTyping] = useState(startTyping);
  const [isDone, setIsDone] = useState(false);
  const textRef = useRef(text);
  const prevTextLengthRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const contentTypeRef = useRef('normal'); // normal, code, markdown, list

  // Phát hiện loại nội dung để điều chỉnh tốc độ hiển thị
  const detectContentType = (text) => {
    if (!text) return 'normal';
    
    // Phát hiện khối mã
    if (text.includes('```') || text.match(/`[^`]+`/g)) {
      return 'code';
    }
    
    // Phát hiện danh sách
    if (text.match(/^(\s*[-*+]\s|[0-9]+\.\s)/m)) {
      return 'list';
    }
    
    // Phát hiện định dạng markdown
    if (text.match(/[*_~`#>]/)) {
      return 'markdown';
    }
    
    return 'normal';
  };

  // Điều chỉnh tốc độ dựa trên loại nội dung và độ dài văn bản
  const getAdjustedSpeed = (remainingText) => {
    if (!smartSpeed) return speed;
    
    const contentType = contentTypeRef.current;
    const textLength = remainingText.length;
    
    // Tăng tốc độ cho văn bản dài
    let adjustedSpeed = speed;
    if (textLength > 500) {
      adjustedSpeed = Math.max(5, speed * 0.5); // Tăng tốc độ cho văn bản dài
    } else if (textLength > 200) {
      adjustedSpeed = Math.max(10, speed * 0.7); // Tăng tốc độ vừa phải
    }
    
    // Điều chỉnh tốc độ dựa trên loại nội dung
    switch (contentType) {
      case 'code':
        return adjustedSpeed * 0.6; // Hiển thị mã nhanh hơn
      case 'list':
        return adjustedSpeed * 0.8; // Hiển thị danh sách hơi nhanh hơn
      case 'markdown':
        return adjustedSpeed * 0.8; // Hiển thị markdown hơi nhanh hơn
      default:
        return adjustedSpeed;
    }
  };
  
  // Tính kích thước batch dựa trên loại nội dung
  const getAdjustedBatchSize = (remainingText) => {
    if (!useChunkedRendering) return 1;
    
    const contentType = contentTypeRef.current;
    const textLength = remainingText.length;
    
    // Tăng batch size cho văn bản dài
    let adjustedBatchSize = batchSize;
    if (textLength > 1000) {
      adjustedBatchSize = batchSize * 2.5; // Tăng nhiều cho văn bản rất dài
    } else if (textLength > 500) {
      adjustedBatchSize = batchSize * 1.8; // Tăng cho văn bản dài
    } else if (textLength > 200) {
      adjustedBatchSize = batchSize * 1.3; // Tăng vừa phải
    }
    
    // Điều chỉnh batch size dựa trên loại nội dung
    switch (contentType) {
      case 'code':
        // Điều chỉnh để hiển thị mã nguồn theo các phân đoạn hợp lý
        // Hiển thị mã nguồn theo dòng hoặc phân đoạn nguyên vẹn
        const codeLines = remainingText.split('\n');
        if (codeLines.length > 1 && codeLines[0].length < 80) {
          return codeLines[0].length + 1; // +1 cho ký tự xuống dòng
        }
        return adjustedBatchSize * 1.5;
        
      case 'list':
        // Cố gắng hiển thị từng mục danh sách hoàn chỉnh
        if (remainingText.indexOf('\n') > 0 && remainingText.indexOf('\n') < 100) {
          return remainingText.indexOf('\n') + 1;
        }
        return adjustedBatchSize;
        
      case 'markdown':
        return adjustedBatchSize * 1.2; // Tăng batch size cho markdown
        
      default:
        return adjustedBatchSize;
    }
  };

  // Cải tiến hiệu ứng đánh chữ với nhiều tối ưu hóa
  useEffect(() => {
    // Dừng typing effect trước đó nếu có
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    // Chỉ bắt đầu hiệu ứng mới khi text thật sự thay đổi
    if (textRef.current !== text) {
      // Phát hiện loại nội dung để điều chỉnh cách hiển thị
      contentTypeRef.current = detectContentType(text);
      
      // Reset nếu nội dung hoàn toàn mới
      if (text.length < prevTextLengthRef.current || !text.startsWith(textRef.current)) {
        setDisplayText('');
        setIsDone(false);
      }
      
      // Cập nhật references
      textRef.current = text;
      prevTextLengthRef.current = text.length;
    }
    
    // Thoát sớm nếu không có nội dung hoặc không cần typing
    if (!text || !startTyping) return;
    
    // Nếu đã hiển thị đủ nội dung
    if (displayText === text) {
      if (isTyping) {
        setIsTyping(false);
        setIsDone(true);
      }
      return;
    }
    
    // Tính phần nội dung còn lại cần hiển thị
    const remainingText = text.substring(displayText.length);
    if (!remainingText) {
      setIsTyping(false);
      setIsDone(true);
      return;
    }
    
    // Bắt đầu hiệu ứng đánh chữ
    setIsTyping(true);
    
    // Hàm đệ quy để hiển thị văn bản với tốc độ thích hợp
    const typeNextChunk = (index = 0) => {
      // Tính batch size tối ưu cho phần nội dung còn lại
      const currentRemaining = remainingText.substring(index);
      const currentBatchSize = getAdjustedBatchSize(currentRemaining);
      const adjustedSpeed = getAdjustedSpeed(currentRemaining);
      
      // Tính phần văn bản tiếp theo cần thêm vào
      const endIndex = Math.min(index + currentBatchSize, remainingText.length);
      const textToAdd = remainingText.substring(index, endIndex);
      
      // Cập nhật văn bản hiển thị
      setDisplayText(current => current + textToAdd);
      
      // Kiểm tra nếu đã hoàn thành toàn bộ văn bản
      if (endIndex >= remainingText.length) {
        setIsTyping(false);
        setIsDone(true);
        return;
      }
      
      // Lên lịch thực hiện chunk tiếp theo
      typingTimeoutRef.current = setTimeout(() => {
        typeNextChunk(endIndex);
      }, adjustedSpeed);
    };
    
    // Bắt đầu hiệu ứng đánh chữ với phần còn lại của văn bản
    typeNextChunk();
    
    // Cleanup khi component unmount hoặc dependencies thay đổi
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [text, displayText, speed, batchSize, startTyping, useChunkedRendering, smartSpeed]);
  
  // Hiệu ứng hiển thị dots (...)
  useEffect(() => {
    if (!isLoading) {
      setDots('');
      return;
    }

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev.length >= 3) return '';
        return prev + '.';
      });
    }, 450); // Tăng thời gian hiệu ứng dots lên để giảm phân tâm

    return () => clearInterval(interval);
  }, [isLoading]);
  
  // Hiển thị con trỏ nháy
  const cursor = showCursor && isTyping ? '|' : '';
  
  // Trả về các giá trị và phương thức hữu ích
  return {
    displayText,        // Văn bản hiện đang hiển thị
    dots,               // Dấu chấm (...) khi đang loading
    isTyping,           // Trạng thái đang đánh chữ
    isDone,             // Đã hoàn thành hiệu ứng đánh chữ
    fullText: displayText + cursor, // Văn bản hiển thị kèm con trỏ nháy
    loadingText: isLoading ? dots : '', // Chỉ hiển thị dots khi đang loading
    progress: text.length > 0 ? displayText.length / text.length : 0, // Tiến độ hiển thị
    contentType: contentTypeRef.current, // Loại nội dung đang hiển thị
    
    // Các phương thức điều khiển
    startTyping: () => setIsTyping(true),
    stopTyping: () => setIsTyping(false),
    resetTyping: () => {
      setDisplayText('');
      setIsDone(false);
    },
    completeTyping: () => {
      // Hiển thị toàn bộ nội dung ngay lập tức
      setDisplayText(text);
      setIsTyping(false);
      setIsDone(true);
      
      // Xóa mọi timeout đã lên lịch
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };
}

export default useTypingEffect;