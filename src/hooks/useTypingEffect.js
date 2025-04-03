import { useState, useEffect } from 'react';

/**
 * Hook tạo hiệu ứng gõ chữ (typing effect) và hiệu ứng loading dots
 * @param {string} text - Văn bản cần hiển thị hiệu ứng gõ chữ
 * @param {boolean} isLoading - Trạng thái đang tải hay không (cho chế độ dots)
 * @param {number} [speed=40] - Tốc độ gõ chữ (ms)
 * @param {boolean} [startTyping=true] - Bắt đầu hiệu ứng ngay lập tức
 * @returns {Object} - Đối tượng chứa văn bản đã hiển thị và trạng thái liên quan
 */
export function useTypingEffect(text = '', options = {}) {
  const {
    isLoading = false,
    speed = 40, 
    startTyping = true,
    showCursor = true
  } = options;
  
  const [displayText, setDisplayText] = useState('');
  const [dots, setDots] = useState('');
  const [isTyping, setIsTyping] = useState(startTyping);
  const [isDone, setIsDone] = useState(false);
  
  // Hiệu ứng gõ chữ
  useEffect(() => { 
    // Reset state khi text thay đổi
    setDisplayText('');
    setIsDone(false);
    
    if (!text || !startTyping) return;
    
    let index = 0;
    setIsTyping(true);
    
    // Hàm hiển thị text từng chữ một
    const typingInterval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(prev => prev + text.charAt(index));
        index++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);
        setIsDone(true);
      }
    }, speed);
    
    return () => clearInterval(typingInterval);
  }, [text, speed, startTyping]);
  
  // Hiệu ứng loading dots
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
    }, 500);

    return () => clearInterval(interval);
  }, [isLoading]);
  
  // Xử lý hiển thị con trỏ nháy
  const cursor = showCursor && isTyping ? '|' : '';
  
  // Return nhiều giá trị hữu ích
  return {
    displayText,        // Text hiện tại đang hiển thị
    dots,               // Hiệu ứng dots (...)
    isTyping,           // Đang trong quá trình gõ chữ
    isDone,             // Đã hoàn thành hiệu ứng
    fullText: displayText + cursor, // Text hiển thị kèm con trỏ nháy
    loadingText: isLoading ? dots : '', // Chỉ hiển thị dots nếu đang loading
    
    // Methods
    startTyping: () => setIsTyping(true),
    stopTyping: () => setIsTyping(false),
    resetTyping: () => {
      setDisplayText('');
      setIsDone(false);
    }
  };
}

export default useTypingEffect;