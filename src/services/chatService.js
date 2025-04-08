// src/services/chatService.js
import api from './api'; 
import { authHeader } from './authService';
import { TextDecoder, TextEncoder } from 'text-encoding';

// Hằng số
const CACHE_TTL = 60 * 1000; // Cache models trong 1 phút
const DEFAULT_MODEL = 'gemma3:4b';
const BATCH_INTERVAL = 50; // ms
const MIN_BATCH_SIZE = 3;  // Số dòng tối thiểu trong batch
const THINKING_TAG = { start: '<think>', end: '</think>' };

// Cache cho models
let modelsCache = null;
let lastFetchTime = 0;

/**
 * Xử lý và làm sạch nội dung tin nhắn
 * @param {string} content - Nội dung cần xử lý
 * @returns {string} - Nội dung đã được làm sạch
 */
function sanitizeContent(content) {
    if (!content || typeof content !== 'string') return '';
    
    try {
        // Xử lý encoding issues
        const encoder = new TextEncoder('utf-8');
        const decoder = new TextDecoder('utf-8', { fatal: false });
        let cleaned = decoder.decode(encoder.encode(content));
        
        // Loại bỏ ký tự control và các ký tự không hợp lệ
        cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
        
        // Xử lý Unicode không hợp lệ
        if (/[\uFFFD\uFFFE\uFFFF]/.test(cleaned)) {
            cleaned = cleaned.replace(/\uFFFD/g, ' ').trim();
        }
        
        // Loại bỏ ký tự đặc biệt không hợp lệ
        if (/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\n\r\t]/g.test(cleaned)) {
            cleaned = cleaned.replace(/[^\x20-\x7E\u00A0-\u00FF\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF\n\r\t]/g, ' ');
        }
        
        // Format khoảng trắng
        cleaned = cleaned.replace(/[ \t]+/g, ' ')
                        .replace(/ +$/gm, '')
                        .replace(/^ +/gm, '')
                        .replace(/\n{3,}/g, '\n\n');
        
        return cleaned || "Không thể hiển thị nội dung do vấn đề mã hóa";
    } catch (e) {
        return "Không thể hiển thị nội dung do lỗi xử lý";
    }
}

/**
 * Tính thời gian thinking
 * @param {object} state - Trạng thái thinking
 * @returns {number|undefined} - Thời gian thinking (ms)
 */
function calculateThinkingTime(state) {
    if (!state.clientSideStartTime) return undefined;
    
    const endTime = state.endTimestamp 
        ? new Date(state.endTimestamp).getTime() 
        : Date.now();
    
    return endTime - state.clientSideStartTime;
}

/**
 * Xử lý nội dung chunk tin nhắn, tách thinking và content
 * @param {string} contentChunk - Nội dung chunk
 * @param {string} timestamp - Timestamp
 * @param {object} state - Trạng thái thinking
 * @returns {object} - Kết quả xử lý
 */
function processMessageContent(contentChunk, timestamp, state) {
    const result = {
        think: state.thinkQueue || '',
        content: state.messageQueue || '',
        thinking: state.isThinking,
        hasFinishedThinking: false,
        thinkingStartTime: state.clientSideStartTime,
        thinkingTime: undefined
    };
    
    const { start: startTag, end: endTag } = THINKING_TAG;
    
    // Xử lý các trường hợp tag <think>
    if (contentChunk.includes(startTag)) {
        // Bắt đầu thinking
        if (!state.isThinking) {
            state.startTimestamp = timestamp;
            state.clientSideStartTime = Date.now();
            result.thinkingStartTime = state.clientSideStartTime;
            state.isThinking = true;
            result.thinking = true;
        }
        
        const startIndex = contentChunk.indexOf(startTag) + startTag.length;
        
        // Xử lý trường hợp có cả tag mở và đóng trong cùng chunk
        if (contentChunk.includes(endTag)) {
            const endIndex = contentChunk.indexOf(endTag);
            result.think += contentChunk.substring(startIndex, endIndex).trim();
            result.content += contentChunk.substring(endIndex + endTag.length).trim();
            
            state.endTimestamp = timestamp;
            result.thinkingTime = calculateThinkingTime(state);
            result.thinking = false;
            result.hasFinishedThinking = true;
            state.isThinking = false;
            state.clientSideStartTime = undefined;
            state.thinkQueue = '';
        } else {
            // Chỉ có tag mở
            result.think += contentChunk.substring(startIndex).trim();
            result.thinking = true;
        }
    } else if (state.isThinking) {
        // Đang trong trạng thái thinking từ chunk trước
        if (contentChunk.includes(endTag)) {
            const endIndex = contentChunk.indexOf(endTag);
            result.think += contentChunk.substring(0, endIndex).trim();
            result.content += contentChunk.substring(endIndex + endTag.length).trim();
            
            state.endTimestamp = timestamp;
            result.thinkingTime = calculateThinkingTime(state);
            result.thinking = false;
            result.hasFinishedThinking = true;
            state.isThinking = false;
            state.clientSideStartTime = undefined;
            state.thinkQueue = '';
        } else {
            // Vẫn đang thinking
            result.think += contentChunk;
            result.thinking = true;
        }
    } else {
        // Không trong thinking mode
        if (contentChunk.includes(endTag)) {
            const endIndex = contentChunk.indexOf(endTag);
            if (state.thinkQueue) {
                result.think += contentChunk.substring(0, endIndex).trim();
            }
            result.content += contentChunk.substring(endIndex + endTag.length).trim();
            
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
    
    // Cập nhật state
    state.thinkQueue = result.hasFinishedThinking ? '' : result.think;
    state.messageQueue = result.content;
    
    return result;
}

/**
 * Biến đổi dữ liệu từ SSE thành response có cấu trúc
 * @param {object|string} rawData - Dữ liệu SSE
 * @param {object} state - Trạng thái thinking
 * @param {string} modelId - ID model
 * @returns {object} - Response đã xử lý
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
            ...(data.eval_count && { eval_count: data.eval_count })
        };
        
        // Nếu không có content trong message
        if (!data.message?.content) {
            return {
                ...baseResponse,
                message: { role: 'assistant', content: state.messageQueue },
                thinking: state.isThinking,
                think: state.thinkQueue,
                thinkingStartTime: state.clientSideStartTime,
                thinkingTime: calculateThinkingTime(state)
            };
        }
        
        // Xử lý chunk content
        const processed = processMessageContent(data.message.content, timestamp, state);
        
        return {
            ...baseResponse,
            message: { role: 'assistant', content: processed.content },
            thinking: processed.thinking,
            think: processed.think,
            thinkingStartTime: processed.thinkingStartTime,
            thinkingTime: processed.hasFinishedThinking ? processed.thinkingTime : undefined
        };
    } catch (e) {
        // Fallback an toàn
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
 * Xử lý dòng dữ liệu SSE
 * @param {string} line - Dòng dữ liệu
 * @param {object} state - Trạng thái thinking
 * @param {string} modelId - ID model
 * @param {function} onMessage - Callback message
 * @param {function} onError - Callback lỗi
 */
function processEventLine(line, state, modelId, onMessage, onError) {
    if (!line?.startsWith('data:')) return;
    
    const jsonStr = line.substring(5).trim();
    if (!jsonStr) return;
    
    try {
        const data = JSON.parse(jsonStr);
        if (data.error) {
            onError(new Error(data.error));
            return;
        }
        
        onMessage(transformToMessageWithThinking(data, state, modelId));
    } catch (e) {
        // Skip JSON parse errors
    }
}

/**
 * Bắt đầu streaming request
 * @param {Object} request - Request object
 * @param {Function} onMessage - Callback message
 * @param {Function} onError - Callback lỗi
 * @returns {Function} - Abort function
 */
function startStreamingRequest(request, onMessage, onError) {
    const controller = new AbortController();
    const signal = controller.signal;
    const url = `/api/ollama/chat/stream`;
    const model = request.model || DEFAULT_MODEL;
    
    // Trạng thái xử lý
    const state = {
        messageQueue: '',
        thinkQueue: '',
        isThinking: false,
        clientSideStartTime: undefined,
        endTimestamp: undefined
    };
    
    // Khởi động stream
    (async function startStream() {
        try {
            const apiUrl = api.defaults.baseURL ? `${api.defaults.baseURL}${url}` : url;
            const headers = {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
                ...authHeader()
            };
            
            // Thử dùng POST request
            const body = JSON.stringify(request);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers,
                body,
                signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
            
            await processStreamResponse(response);
        } catch (error) {
            if (error.name === 'AbortError') {
                // Gửi message kết thúc nếu stream bị abort
                onMessage({
                    model: model,
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
                });
            } else {
                onError(error);
            }
        }
    })();
    
    /**
     * Xử lý stream response
     * @param {Response} response - Fetch Response object
     */
    async function processStreamResponse(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let batchTimer = null;
        let batchBuffer = [];
        let currentBatchSize = 0;
        
        // Xử lý batch để tối ưu performance
        function processBatch() {
            batchBuffer.forEach(line => {
                if (line.trim()) {
                    processEventLine(line, state, model, onMessage, onError);
                }
            });
            
            batchBuffer = [];
            currentBatchSize = 0;
            batchTimer = null;
        }
        
        // Đọc stream
        while (true) {
            const { value, done } = await reader.read();
            
            if (done) {
                // Xử lý data còn lại trong buffer
                if (buffer.trim()) {
                    buffer.split('\n').forEach(line => {
                        if (line.trim()) {
                            processEventLine(line, state, model, onMessage, onError);
                        }
                    });
                }
                
                // Xử lý batch cuối
                if (batchTimer) {
                    clearTimeout(batchTimer);
                    processBatch();
                }
                
                // Gửi message kết thúc
                onMessage({
                    model: model,
                    created_at: new Date().toISOString(),
                    message: { role: 'assistant', content: state.messageQueue },
                    thinking: false,
                    think: state.thinkQueue,
                    thinkingTime: calculateThinkingTime(state),
                    done: true
                });
                
                break;
            }
            
            // Decode chunk và xử lý
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            if (lines.length > 0) {
                batchBuffer.push(...lines);
                currentBatchSize += lines.length;
                
                // Xử lý ngay nếu batch đủ lớn
                if (currentBatchSize >= MIN_BATCH_SIZE) {
                    if (batchTimer) {
                        clearTimeout(batchTimer);
                        batchTimer = null;
                    }
                    processBatch();
                } else if (!batchTimer) {
                    // Đặt timer nếu chưa có
                    batchTimer = setTimeout(processBatch, BATCH_INTERVAL);
                }
            }
        }
    }
    
    // Return abort function
    return () => {
        controller.abort();
        return true;
    };
}

// API methods

/**
 * Lấy danh sách chat của user
 * @param {number} page - Số trang
 * @param {number} size - Kích thước trang
 * @returns {Promise} - API response
 */
const getUserChats = async (page = 0, size = 10) => {
    return api.get(`/api/chat?page=${page}&size=${size}`);
};

/**
 * Lấy tin nhắn của chat
 * @param {number} chatId - ID chat
 * @returns {Promise} - API response
 */
const getChatMessages = async (chatId) => {
    const response = await api.get(`/api/chat/${chatId}/messages`);
    
    // Chuyển đổi format tin nhắn
    if (response.data && Array.isArray(response.data)) {
        response.data = response.data.map(message => {
            const content = message.content || '';
            let messageContent = content;
            let thinkContent = '';
            
            // Tách thinking content
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
 * @param {string} model - Model AI
 * @param {string} title - Tiêu đề
 * @param {string} description - Mô tả
 * @returns {Promise} - API response
 */
const createChat = async (model, title, description = '') => {
    const useModel = model || DEFAULT_MODEL;
    
    const chatRequest = {
        model: useModel,
        title: String(title || 'Chat mới'),
        messages: []
    };
    
    if (description) {
        chatRequest.description = String(description);
    }
    
    return api.post('/api/chat', chatRequest);
};

/**
 * Gửi tin nhắn
 * @param {number} chatId - ID chat
 * @param {string} content - Nội dung tin nhắn
 * @returns {Promise} - API response
 */
const sendMessage = async (chatId, content) => {
    const messageData = { content: String(content) };
    return api.post(`/api/chat/${chatId}/message`, messageData);
};

/**
 * Xóa chat
 * @param {number} chatId - ID chat
 * @returns {Promise} - API response
 */
const deleteChat = async (chatId) => {
    return api.delete(`/api/chat/${chatId}`);
};

/**
 * Lấy danh sách models AI
 * @returns {Promise<Array>} - Danh sách models
 */
const listModels = async () => {
    try {
        const now = Date.now();
        
        // Sử dụng cache nếu còn hiệu lực
        if (modelsCache && (now - lastFetchTime < CACHE_TTL)) {
            return modelsCache;
        }
        
        // Gọi API lấy models
        const response = await api.get('/api/ollama/models', { 
            headers: { 'Authorization': authHeader().Authorization || '' }
        });
        
        if (!response.data) return [];
        
        // Format models
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
        // Sử dụng cache cũ nếu có lỗi
        if (modelsCache) return modelsCache;
        
        // Fallback models
        return [
            {
                id: "gemma3:4b", name: "gemma3:4b",
                displayName: "Gemma 3 (4B)", size: "4B"
            },
            {
                id: "llama3:8b", name: "llama3:8b",
                displayName: "Llama 3 (8B)", size: "8B"
            }
        ];
    }
};

// Xuất dịch vụ
const chatService = {
    startStreamingRequest,
    getUserChats,
    getChatMessages,
    createChat,
    sendMessage,
    deleteChat,
    listModels
};

export default chatService;