// src/services/chatService.js
import api from './api'; // Instance Axios đã cấu hình interceptor
import { authHeader } from './authService'; // Vẫn cần hàm này cho fetch thủ công
import { TextDecoder, TextEncoder } from 'text-encoding';

// Thiết lập các bộ giải mã/mã hóa văn bản
const utf8Decoder = new TextDecoder('utf-8', { fatal: false });
const utf8Encoder = new TextEncoder('utf-8');

/**
 * Hàm xử lý văn bản có thể bị lỗi encoding
 * @param {string} text - Văn bản đầu vào
 * @returns {string} - Văn bản đã được xử lý
 */
function fixEncodingIssues(text) {
    if (!text || typeof text !== 'string') return '';
    
    try {
        // Chuyển đổi văn bản thành mảng byte, sau đó decode lại
        // Giúp loại bỏ các byte không hợp lệ
        const bytes = utf8Encoder.encode(text);
        const decodedText = utf8Decoder.decode(bytes);
        
        // Nếu kết quả khác với đầu vào, có thể đã sửa được lỗi
        if (decodedText !== text) {
            console.log("[fixEncodingIssues] Đã sửa vấn đề encoding");
            return decodedText;
        }
        
        return text;
    } catch (e) {
        console.error("[fixEncodingIssues] Lỗi khi xử lý encoding:", e);
        return text; // Trả về nguyên bản nếu có lỗi
    }
}

/**
 * Hàm làm sạch nội dung tin nhắn, xử lý các vấn đề encoding nhưng bảo toàn định dạng markdown
 * @param {string} content - Nội dung tin nhắn cần làm sạch
 * @returns {string} - Nội dung đã được làm sạch
 */
function sanitizeMessageContent(content) {
    if (!content || typeof content !== 'string') {
        return '';
    }
    
    console.log("Sanitizing message content - Original:", content.substring(0, 50));
    
    // Xử lý vấn đề encoding
    try {
        // 0. Thử sửa các vấn đề encoding trước
        let cleaned = fixEncodingIssues(content);
        
        // 1. Loại bỏ các ký tự control không hợp lệ nhưng giữ lại xuống dòng
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
        
        // 2. Thử decode lại từ chuỗi nếu có vấn đề với UTF-8
        if (/[\uFFFD\uFFFE\uFFFF]/.test(cleaned)) {
            // Nếu có ký tự thay thế Unicode (\uFFFD) hoặc ký tự không hợp lệ
            console.log("Phát hiện ký tự thay thế () - thử decode lại");
            
            // Chuyển đổi các byte không hợp lệ thành khoảng trắng
            cleaned = cleaned.replace(/\uFFFD/g, ' ').trim();
        }
        
        // 3. Nếu vẫn có vấn đề, thay thế các chuỗi kỳ lạ bằng khoảng trắng
        if (/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\n\r\t]/g.test(cleaned)) {
            cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\n\r\t]/g, ' ');
        }
        
        // 4. Chỉ loại bỏ các khoảng trắng liên tiếp trên cùng một dòng
        // nhưng giữ lại việc xuống dòng
        cleaned = cleaned.replace(/[ \t]+/g, ' '); // Thay nhiều khoảng trắng bằng một khoảng
        cleaned = cleaned.replace(/ +$/gm, '');  // Loại bỏ khoảng trắng cuối dòng
        cleaned = cleaned.replace(/^ +/gm, '');  // Loại bỏ khoảng trắng đầu dòng
        
        // Loại bỏ quá nhiều dòng trống liên tiếp (giữ tối đa 2 dòng trống)
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
        
        if (cleaned !== content) {
            console.log("Sanitizing message content - After cleaning:", cleaned.substring(0, 50));
        }
        
        return cleaned || "Không thể hiển thị nội dung do vấn đề mã hóa";
    } catch (e) {
        console.error("Error sanitizing message content:", e);
        return "Không thể hiển thị nội dung do lỗi xử lý";
    }
}

/**
 * Lấy danh sách chat của người dùng hiện tại
 * @param {number} page - Số trang (mặc định: 0)
 * @param {number} size - Kích thước trang (mặc định: 10)
 * @returns {Promise<object>} Promise chứa phản hồi từ API
 */
const getUserChats = async (page = 0, size = 10) => {
  return api.get(`/api/chat?page=${page}&size=${size}`);
};

/**
 * Lấy tin nhắn của một chat cụ thể
 * @param {number} chatId - ID của chat
 * @returns {Promise<object>} Promise chứa phản hồi từ API
 */
const getChatMessages = async (chatId) => {
  const response = await api.get(`/api/chat/${chatId}/messages`);
  console.log("API Message Format:", response.data?.[0]);
  
  // Xử lý dữ liệu để phù hợp với định dạng mới giống ViVu Chat
  if (response.data && Array.isArray(response.data)) {
    response.data = response.data.map(message => {
      const content = message.content || '';
      
      // Tách phần thinking từ content theo pattern <think>...</think>
      let messageContent = content;
      let thinkContent = '';
      
      const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>([\s\S]*)/);
      if (thinkMatch) {
        thinkContent = thinkMatch[1].trim();
        messageContent = (thinkMatch[2] || '').trim();
      }
      
      return {
        ...message,
        content: messageContent,
        think: thinkContent,
        thinking: false,
        thinkingTime: message.thinkingTime || undefined
      };
    });
  }
  
  return response;
};

/**
 * Tạo chat mới
 * @param {string} model - Tên mô hình để sử dụng cho chat
 * @param {string} title - Tiêu đề cho chat
 * @param {string} description - Mô tả cho chat (tùy chọn)
 * @returns {Promise<object>} Promise chứa phản hồi từ API
 */
const createChat = async (model, title, description = '') => {
  try {
    // Sử dụng model được truyền vào thay vì hard-code
    const useModel = model || "gemma3:4b";
    console.log("Creating chat with model:", useModel);

    // Cấu trúc request theo đúng định dạng của API trong OpenAPI spec
    const chatRequest = {
      model: useModel,
      title: String(title || 'Chat mới'),
      messages: [] // Mảng messages ban đầu rỗng
    };

    // Thêm description nếu có
    if (description) {
      chatRequest.description = String(description);
    }

    // Log dữ liệu trước khi gửi để debug
    console.log("Creating chat with request:", JSON.stringify(chatRequest, null, 2));

    // Gửi yêu cầu tạo chat mới và bắt lỗi chi tiết
    try {
      const response = await api.post('/api/chat', chatRequest);
      return response;
    } catch (apiError) {
      console.error("API Error Response:", {
        status: apiError.response?.status,
        statusText: apiError.response?.statusText,
        data: apiError.response?.data,
        url: apiError.config?.url
      });
      throw apiError;
    }
  } catch (error) {
    console.error("Error preparing chat creation data:", error);
    throw error;
  }
};

/**
 * Gửi tin nhắn đến một chat
 * @param {number} chatId - ID của chat
 * @param {string} content - Nội dung tin nhắn
 * @returns {Promise<object>} Promise chứa phản hồi từ API
 */
const sendMessage = async (chatId, content) => {
  // Đảm bảo content là string
  const messageData = {
    content: String(content)
  };

  // Log dữ liệu trước khi gửi để debug
  console.log(`Sending message to chat ${chatId}:`, JSON.stringify(messageData));

  return api.post(`/api/chat/${chatId}/message`, messageData);
};

/**
 * Xóa một chat
 * @param {number} chatId - ID của chat cần xóa
 * @returns {Promise<object>} Promise chứa phản hồi từ API
 */
const deleteChat = async (chatId) => {
  return api.delete(`/api/chat/${chatId}`);
};

/**
 * Lấy danh sách các mô hình AI có sẵn từ API
 * @returns {Promise<Array>} Danh sách các mô hình
 */
// Cache cho models để tránh gọi API liên tục
let modelsCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 60 * 1000; // Cache trong 1 phút

const listModels = async () => {
  try {
    const now = Date.now();
    
    // Sử dụng cache nếu còn hiệu lực
    if (modelsCache && (now - lastFetchTime < CACHE_TTL)) {
      console.log("Sử dụng danh sách models từ cache");
      return modelsCache;
    }
    
    // Gọi API để lấy danh sách models
    console.log("Đang tải danh sách models từ API...");
    const response = await api.get('/api/ollama/models', { 
      headers: {
        'Authorization': getAuthHeaderString()
      }
    });
    
    if (!response.data) {
      return [];
    }
    
    // Chuyển đổi định dạng từ API sang định dạng ModelSelector cần
    const formattedModels = response.data.map(model => ({
      id: model.id || model.name,
      name: model.name,
      displayName: model.displayName || model.name.split(':')[0],
      size: model.size || model.parameters,
      modified: model.modified || model.lastModified
    }));
    
    // Cập nhật cache
    modelsCache = formattedModels;
    lastFetchTime = now;
    
    return formattedModels;
  } catch (error) {
    console.error("Error fetching models:", error);
    
    // Nếu có lỗi nhưng có cache cũ, sử dụng cache cũ
    if (modelsCache) {
      console.warn("Sử dụng cache cũ do lỗi API");
      return modelsCache;
    }
    
    // Fallback với models mặc định nếu API không có sẵn
    console.warn("Trả về models mặc định");
    return [
      {
        id: "gemma3:4b",
        name: "gemma3:4b",
        displayName: "Gemma 3 (4B)",
        size: "4B"
      },
      {
        id: "llama3:8b",
        name: "llama3:8b",
        displayName: "Llama 3 (8B)",
        size: "8B"
      }
    ];
  }
};

/**
 * Lấy header Authorization từ authService
 * @returns {string} Chuỗi header Authorization hoặc chuỗi rỗng
 */
function getAuthHeaderString() {
    const headers = authHeader();
    return headers.Authorization || '';
}

/**
 * Xử lý nội dung chunk tin nhắn, tách phần thinking và content thật
 * @param {string} contentChunk - Phần nội dung từ chunk SSE
 * @param {string} timestamp - Timestamp của chunk
 * @param {object} state - Trạng thái thinking nội bộ 
 * @returns {object} - { think, content, thinking, hasFinishedThinking, thinkingStartTime, thinkingTime }
 */
function processMessageContent(contentChunk, timestamp, state) {
    // Khởi tạo kết quả dựa trên state hiện tại
    const result = {
        think: state.thinkQueue,
        content: state.messageQueue,
        thinking: state.isThinking,
        hasFinishedThinking: false,
        thinkingStartTime: state.clientSideStartTime,
        thinkingTime: undefined
    };

    const thinkStartTag = '<think>';
    const thinkEndTag = '</think>';

    // Xử lý logic dựa trên sự xuất hiện của tag <think> và </think>
    if (contentChunk.includes(thinkStartTag)) {
        if (!state.isThinking) {
            state.startTimestamp = timestamp;
            state.clientSideStartTime = Date.now();
            result.thinkingStartTime = state.clientSideStartTime;
            state.isThinking = true; // Bắt đầu thinking
            result.thinking = true;
        }
        const startIndex = contentChunk.indexOf(thinkStartTag) + thinkStartTag.length;

        if (contentChunk.includes(thinkEndTag)) {
            // Có cả mở và đóng tag trong chunk này
            const endIndex = contentChunk.indexOf(thinkEndTag);
            const thinkContent = contentChunk.substring(startIndex, endIndex).trim();
            result.think += thinkContent; // Nối vào think queue

            const contentAfterThinking = contentChunk.substring(endIndex + thinkEndTag.length).trim();
            result.content += contentAfterThinking; // Nối vào message queue

            state.endTimestamp = timestamp;
            result.thinkingTime = calculateThinkingTime(state);
            result.thinking = false; // Kết thúc thinking
            result.hasFinishedThinking = true;
            state.isThinking = false;
            state.clientSideStartTime = undefined; // Reset start time
            state.thinkQueue = ''; // Reset think queue sau khi hoàn thành
        } else {
            // Chỉ có tag mở
            const thinkContent = contentChunk.substring(startIndex).trim();
            result.think += thinkContent;
            result.thinking = true;
        }
    } else if (state.isThinking) { // Đang trong trạng thái thinking từ chunk trước
        if (contentChunk.includes(thinkEndTag)) {
            // Tìm thấy tag đóng
            const endIndex = contentChunk.indexOf(thinkEndTag);
            const thinkContent = contentChunk.substring(0, endIndex).trim();
            result.think += thinkContent;

            const contentAfterThinking = contentChunk.substring(endIndex + thinkEndTag.length).trim();
            result.content += contentAfterThinking;

            state.endTimestamp = timestamp;
            result.thinkingTime = calculateThinkingTime(state);
            result.thinking = false;
            result.hasFinishedThinking = true;
            state.isThinking = false;
            state.clientSideStartTime = undefined;
            state.thinkQueue = '';
        } else {
            // Vẫn đang thinking, nối toàn bộ chunk vào think queue
            result.think += contentChunk;
            result.thinking = true;
        }
    } else { // Không thinking và không có tag mở
        // Xử lý trường hợp chỉ có tag đóng (do tag mở ở chunk trước)
         if (contentChunk.includes(thinkEndTag)) {
            const endIndex = contentChunk.indexOf(thinkEndTag);
            const thinkContent = contentChunk.substring(0, endIndex).trim();

            if (state.thinkQueue) { // Chỉ nối nếu đã có think content trước đó
                 result.think += thinkContent;
            }

             const contentAfterThinking = contentChunk.substring(endIndex + thinkEndTag.length).trim();
             result.content += contentAfterThinking;

             state.endTimestamp = timestamp;
             result.thinkingTime = calculateThinkingTime(state);
             result.hasFinishedThinking = true;
             state.clientSideStartTime = undefined;
             
             state.thinkQueue = ''; 
         } else {
            // Nội dung bình thường
            result.content += contentChunk;
         }
         result.thinking = false;
    }

    // Cập nhật lại state để dùng cho chunk tiếp theo
    state.thinkQueue = result.hasFinishedThinking ? '' : result.think; // Reset thinkQueue nếu vừa xong
    state.messageQueue = result.content;

    return result;
}

/**
 * Tính thời gian thinking (client-side)
 * @param {object} state - Trạng thái thinking nội bộ
 * @returns {number | undefined} Thời gian thinking (ms) hoặc undefined
 */
function calculateThinkingTime(state) {
    // Ưu tiên tính dựa trên clientSideStartTime nếu có
    if (state.clientSideStartTime) {
        // Nếu đã có endTimestamp (hoặc isThinking vừa chuyển thành false)
        if (state.endTimestamp || !state.isThinking) {
             // Dùng thời gian hiện tại nếu endTimestamp chưa kịp set
             const endTime = state.endTimestamp ? new Date(state.endTimestamp).getTime() : Date.now();
             return endTime - state.clientSideStartTime;
        }
    }
    return undefined;
}

/**
 * Biến đổi dữ liệu thô từ SSE thành object response có cấu trúc, bao gồm thông tin thinking
 * Cải tiến từ ViVu Chat Compose để hiển thị thinking time
 * @param {object | string} rawData - Dữ liệu thô từ SSE (đã parse JSON hoặc chuỗi JSON)
 * @param {object} state - Trạng thái thinking nội bộ
 * @param {string} modelId - Tên model đang dùng
 * @returns {object} - EnhancedResponse
 */
function transformToMessageWithThinking(rawData, state, modelId) {
    try {
        const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        const timestamp = data.created_at || new Date().toISOString();

        const baseResponse = {
            model: data.model || modelId,
            created_at: timestamp,
            done: !!data.done,
            ...(data.total_duration && { total_duration: data.total_duration }),
            ...(data.eval_count && { eval_count: data.eval_count }),
        };

        // Trường hợp không có content trong message (ví dụ chunk cuối chỉ có 'done')
        if (!data.message?.content) {
            // Trả về state cuối cùng của think/message queue
            return {
                ...baseResponse,
                message: {
                    role: 'assistant',
                    content: state.messageQueue // Nội dung tích lũy cuối cùng
                },
                thinking: state.isThinking, // Trạng thái thinking cuối cùng
                think: state.thinkQueue,    // Nội dung thinking cuối cùng
                thinkingStartTime: state.clientSideStartTime,
                thinkingTime: calculateThinkingTime(state)
            };
        }

        const messageContentChunk = data.message.content;

        // Xử lý chunk content để tách think/message
        const processed = processMessageContent(messageContentChunk, timestamp, state);

        return {
            ...baseResponse,
            message: {
                role: 'assistant',
                content: processed.content // Nội dung message tích lũy
            },
            thinking: processed.thinking, // Trạng thái thinking hiện tại
            think: processed.think,      // Nội dung thinking tích lũy
            thinkingStartTime: processed.thinkingStartTime, // Thời điểm bắt đầu thinking (client)
            // Tính thinkingTime nếu vừa kết thúc thinking trong chunk này
            thinkingTime: processed.hasFinishedThinking ? processed.thinkingTime : undefined
        };

    } catch (e) {
        console.error("Lỗi biến đổi message:", e);
        // Trả về fallback an toàn
        return {
            model: modelId,
            created_at: new Date().toISOString(),
            message: { role: 'assistant', content: state.messageQueue },
            done: false,
            thinking: state.isThinking,
            think: state.thinkQueue,
            thinkingStartTime: state.clientSideStartTime,
            thinkingTime: calculateThinkingTime(state)
        };
    }
}

/**
 * Xử lý một dòng dữ liệu từ SSE stream
 * @param {string} line - Một dòng từ stream (ví dụ: "data: {...}")
 * @param {object} state - Trạng thái thinking nội bộ
 * @param {string} modelId - Tên model
 * @param {function} onMessage - Callback để gửi message đã xử lý về component
 * @param {function} onError - Callback khi có lỗi JSON hoặc lỗi từ data
 */
function processEventLine(line, state, modelId, onMessage, onError) {
    if (!line?.startsWith('data:')) return; // Bỏ qua dòng không phải data

    const jsonStr = line.substring(5).trim();
    if (!jsonStr) return; // Bỏ qua dòng data rỗng

    try {
        const data = JSON.parse(jsonStr);

        if (data.error) {
            onError(new Error(data.error));
            return;
        }

        // Biến đổi và gửi message về component qua callback onMessage
        const transformedMessage = transformToMessageWithThinking(data, state, modelId);
        onMessage(transformedMessage);
    } catch (e) {
        // Lỗi parse JSON thường không nên dừng stream, chỉ cảnh báo
        console.warn("Lỗi parse JSON từ SSE:", e, jsonStr);
    }
}

/**
 * Bắt đầu một streaming request và trả về hàm abort
 * Được cải tiến từ ViVu Chat Compose để hỗ trợ hiển thị thinking process
 * @param {Object} request - Request object { model, messages, options }
 * @param {Function} onMessage - Callback khi có message mới
 * @param {Function} onError - Callback khi có lỗi
 * @returns {Function} Hàm để abort stream
 */
function startStreamingRequest(request, onMessage, onError) {
    // Tạo abortion controller để cancel request khi cần
    const abortController = new AbortController();
    const { signal } = abortController;
    
    // Khởi tạo state cho thinking tracking
    const state = {
        isThinking: false,        // Đang trong trạng thái thinking hay không
        thinkQueue: '',           // Nội dung thinking hiện tại (chưa hoàn thành)
        messageQueue: '',         // Nội dung message hiện tại (không bao gồm thinking)
        clientSideStartTime: null, // Thời điểm bắt đầu thinking (client-side)
        startTimestamp: null,     // Timestamp bắt đầu thinking (server-side)
        endTimestamp: null,       // Timestamp kết thúc thinking (server-side)
    };

    // Chuẩn bị URL và headers
    const url = '/api/ollama/chat/stream';
    
    // Chuẩn bị request body
    const body = JSON.stringify({
        model: request.model,
        messages: request.messages,
        stream: true,
        options: request.options || {}
    });
    
    // Khởi tạo stream xử lý
    async function startStream() {
        try {
            const apiUrl = api.defaults.baseURL ? `${api.defaults.baseURL}${url}` : url;
            const headers = {
                'Content-Type': 'application/json',
                ...authHeader()
            };
            
            console.log(`Starting stream to ${apiUrl} with model ${request.model}`);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body,
                signal
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error ${response.status}: ${errorText}`);
            }
            
            // Get ReadableStream from response and start reading
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            
            // Process stream
            while (true) {
                const { value, done } = await reader.read();
                
                if (done) {
                    // Handle any remaining data in buffer
                    if (buffer.trim()) {
                        const lines = buffer.split('\n');
                        lines.forEach(line => {
                            if (line.trim()) {
                                processEventLine(line, state, request.model, onMessage, onError);
                            }
                        });
                    }
                    break;
                }
                
                // Decode chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });
                
                // Process complete lines from buffer
                const lines = buffer.split('\n');
                buffer = lines.pop() || ''; // Last line might be incomplete
                
                // Process each complete line
                lines.forEach(line => {
                    if (line.trim()) {
                        processEventLine(line, state, request.model, onMessage, onError);
                    }
                });
            }
            
            // Handle final chunk (ensuring 'done: true' is sent)
            const finalResponse = {
                model: request.model,
                created_at: new Date().toISOString(),
                message: { 
                    role: 'assistant', 
                    content: state.messageQueue
                },
                thinking: false,
                think: state.thinkQueue,
                thinkingTime: calculateThinkingTime(state),
                done: true
            };
            
            onMessage(finalResponse);
            console.log('Stream completed normally');
            
        } catch (error) {
            if (error.name === 'AbortError') {
                console.log('Stream aborted by user');
                
                // Khi stream bị abort, gửi một message cuối để đánh dấu kết thúc
                const finalResponse = {
                    model: request.model,
                    created_at: new Date().toISOString(),
                    message: { 
                        role: 'assistant', 
                        content: state.messageQueue || 'Phản hồi bị dừng bởi người dùng.'
                    },
                    thinking: false,
                    think: state.thinkQueue,
                    thinkingTime: calculateThinkingTime(state),
                    done: true,
                    aborted: true
                };
                
                onMessage(finalResponse);
            } else {
                console.error('Stream error:', error);
                onError(error);
            }
        }
    }
    
    // Start streaming and return abort function
    startStream().catch(error => {
        console.error('Error in stream:', error);
        onError(error);
    });
    
    return () => {
        console.log('Aborting stream...');
        abortController.abort();
    };
}

// Xuất tất cả các phương thức API cho chat service
const chatService = { 
    startStreamingRequest,
    processEventLine,
    transformToMessageWithThinking,
    getAuthHeaderString,
    getUserChats,
    getChatMessages,
    createChat,
    sendMessage,
    deleteChat,
    listModels  // Thêm phương thức mới cho model selector
};

export default chatService;