// src/services/api.js
import axios from 'axios';
import { authHeader } from './authService'; // Import hàm authHeader từ authService

const API_BASE_URL = ''; 

// Helper function để loại bỏ tham chiếu vòng tròn từ object
const safeStringify = (obj) => {
  const cache = new Set();
  
  return JSON.stringify(obj, (key, value) => {
    // Nếu là object hoặc array và không null
    if (typeof value === 'object' && value !== null) {
      // Kiểm tra nếu đã thấy object này trước đó
      if (cache.has(value)) {
        // Đây là circular reference, trả về null hoặc biểu diễn đơn giản khác
        return '[Circular Reference]';
      }
      
      // Thêm vào cache để kiểm tra tham chiếu vòng tròn
      cache.add(value);
    }
    
    // Lọc ra các thuộc tính DOM và React fiber
    if (key.startsWith('__react') || key.startsWith('_react') || 
        key === 'stateNode' || key === 'return' || key === 'parent' ||
        key === 'memoizedState' || key === 'memoizedProps') {
      return undefined;
    }
    
    return value;
  });
};

// Đặt biến để kiểm soát việc redirect để tránh vòng lặp vô hạn
const REDIRECT_COOLDOWN_KEY = 'auth_redirect_cooldown';
const REDIRECT_COOLDOWN_TIME = 5000; // 5 giây giữa các lần chuyển hướng

// Hàm kiểm tra xem có đang ở trang đăng nhập không
const isOnLoginPage = () => {
  return window.location.pathname.includes('/login');
};

// Hàm kiểm tra và đặt cooldown cho việc chuyển hướng
const canRedirectToLogin = () => {
  const now = Date.now();
  const lastRedirect = localStorage.getItem(REDIRECT_COOLDOWN_KEY);
  
  if (lastRedirect && (now - parseInt(lastRedirect)) < REDIRECT_COOLDOWN_TIME) {
    console.log('Đã chuyển hướng gần đây, bỏ qua yêu cầu chuyển hướng mới');
    return false;
  }
  
  localStorage.setItem(REDIRECT_COOLDOWN_KEY, now.toString());
  return true;
};

// Tạo instance axios với withCredentials bật
const createApi = (toastService = null) => {
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true, // Giữ lại để hỗ trợ xác thực session-based
    // Thêm transform request để xử lý dữ liệu trước khi gửi đi
    transformRequest: [
      (data, headers) => {
        // Nếu không phải là FormData, chuyển đổi thành JSON an toàn
        if (data instanceof FormData) {
          
          return data;
        }
        
        // Nếu data là object hoặc array, chuyển đổi an toàn
        if (typeof data === 'object' && data !== null) {
          try {
            // Lọc bỏ circular references
            const safeData = JSON.parse(safeStringify(data));
            return JSON.stringify(safeData);
          } catch (error) {
            console.error('Error in transform request:', error);
            // Fallback: trả về object gốc cho Axios xử lý
            return data;
          }
        }
        
        return data;
      },
      ...axios.defaults.transformRequest // Giữ lại bộ transform mặc định
    ],
  });

  // --- Axios Request Interceptor ---
  // Interceptor này sẽ được gọi TRƯỚC KHI mỗi request được gửi đi bởi instance 'api'
  api.interceptors.request.use(
    (config) => {
      const headers = authHeader(); // Lấy header xác thực hiện tại
      if (headers.Authorization) {
        config.headers['Authorization'] = headers.Authorization; // Gán vào header của request
      }
      
      // Thêm X-XSRF-TOKEN nếu có trong cookies
      const cookies = document.cookie.split(';');
      const xsrfCookie = cookies.find(cookie => cookie.trim().startsWith('XSRF-TOKEN='));
      if (xsrfCookie) {
        const xsrfToken = xsrfCookie.split('=')[1];
        config.headers['X-XSRF-TOKEN'] = xsrfToken;
      }
      
      // Đảm bảo Content-Type luôn đúng
      if (config.method !== 'get') {
        config.headers['Content-Type'] = 'application/json';
      }
      
      // Debug request
      console.log('Gửi request:', {
        url: config.url,
        method: config.method,
        headers: config.headers,
        data: config.data
      });
      
      return config;
    },
    (error) => {
      // Xử lý lỗi interceptor (ít khi xảy ra ở đây)
      console.error('Request Interceptor Error:', error);
      return Promise.reject(error);
    }
  );

  // --- Axios Response Interceptor (Tùy chọn) ---
  // Interceptor này xử lý response TRƯỚC KHI nó được trả về cho lời gọi .then() hoặc .catch()
  api.interceptors.response.use(
    (response) => {
      // Xử lý response thành công (ví dụ: chỉ trả về response.data)
      // console.log('Response:', response); // Bỏ comment để debug response
      return response; // Hoặc return response.data; nếu bạn luôn muốn lấy data
    },
    (error) => {
      // Xử lý các lỗi response chung (ví dụ: 401 Unauthorized, 403 Forbidden)
      if (error.response) {
        console.error('Response Error:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers,
          url: error.config?.url
        });
        
        // Xử lý trường hợp 401 (Unauthorized) hoặc 403 (Forbidden)
        if (error.response.status === 401 || error.response.status === 403) {
          // Kiểm tra xem đây có phải là API models không
          const isModelsApi = error.config?.url?.includes('/api/ollama/models');
          const isApiCall = error.config?.url?.startsWith('/api/');
          
          // Nếu là lỗi 403 từ API models hoặc các API yêu cầu xác thực khác
          if (error.response.status === 403 && (isModelsApi || isApiCall)) {
            console.error('Phiên đăng nhập hết hạn hoặc không hợp lệ');
            
            // Xóa thông tin người dùng hiện tại từ localStorage
            localStorage.removeItem('user');
            
            // Hiển thị thông báo lỗi một lần
            if (toastService) {
              toastService.error('Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.');
            }
            
            // Chỉ chuyển hướng nếu:
            // 1. Không đang ở trang đăng nhập
            // 2. Đủ thời gian cooldown giữa các lần chuyển hướng
            if (!isOnLoginPage() && canRedirectToLogin()) {
              console.log('Chuyển hướng đến trang đăng nhập...');
              window.location.href = '/login';
            } else {
              console.log('Bỏ qua việc chuyển hướng đến trang đăng nhập (đã ở trang đăng nhập hoặc đã chuyển hướng gần đây)');
            }
            
            return Promise.reject(new Error('Session expired'));
          }
          
          // Xử lý lỗi 403 chung
          if (error.response.status === 403) {
            console.error('Lỗi 403 - Forbidden:', error.response.data);
            // Hiển thị toast nếu có toastService
            if (toastService) {
              toastService.error('Bạn không có quyền truy cập vào chức năng này');
            }
          }
          
          // Xử lý lỗi 401 chung
          if (error.response.status === 401) {
            // Xử lý lỗi 401 (ví dụ: logout user, chuyển hướng về login)
            console.error("Unauthorized! Logging out.");
            // Hiển thị toast nếu có toastService
            if (toastService) {
              const errorMessage = error.response.data?.message || 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ';
              toastService.error(errorMessage);
            }
          }
        }
      } else {
        console.error('Response Interceptor Error:', error.message);
        // Hiển thị toast cho lỗi mạng
        if (toastService && error.message) {
          if (error.message === 'Network Error') {
            toastService.error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng của bạn.');
          } else {
            toastService.error(`Đã xảy ra lỗi: ${error.message}`);
          }
        }
      }
      
      // Đảm bảo reject lỗi để .catch() ở nơi gọi API vẫn hoạt động
      return Promise.reject(error);
    }
  );

  return api;
};

// Tạo instance mặc định không có toast service
const api = createApi();

export default api; // Export instance đã cấu hình
export { createApi }; // Export hàm tạo instance cho các component cần toast