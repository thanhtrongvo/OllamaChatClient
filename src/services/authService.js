import api, { createApi } from "./api";

const API_URL = "/api/auth/";

// Các hàm cốt lõi không phụ thuộc vào toast
const register = (username, email, password, firstName, lastName) => {
    return api.post(API_URL + "register", {
        username,
        email,
        password,
        firstName,
        lastName
    });
}

const login = (username, password) => { 
    const credentials = {
        username: username.trim(),
        password: password
    };
    
    return api.post(API_URL + "login", credentials)
    .then(response => {
        if (response.data && response.data.accessToken) {
            localStorage.setItem("user", JSON.stringify(response.data));
        }
        return response.data;
    })
    .catch(error => {
        const errorMessage = 
            (error.response?.data?.message) || 
            (error.response?.status === 403 ? "Tài khoản hoặc mật khẩu không chính xác" : 
            (error.response?.status === 401 ? "Tài khoản hoặc mật khẩu không chính xác" : 
            "Đã xảy ra lỗi khi đăng nhập"));
        
        const enhancedError = new Error(errorMessage);
        enhancedError.originalError = error;
        throw enhancedError;
    });
}

const logout = () => {
    const user = getCurrentUser();
    localStorage.removeItem("user");
    return api.post(API_URL + "logout",
        {
            username: user?.username
        }
    )
}

const getCurrentUser = () => {
    const userStr = localStorage.getItem("user");
    if (!userStr) return null;
    try {
        return JSON.parse(userStr);
    } catch (e) {
        console.error("Lỗi parse user từ localStorage:", e);
        return null;
    }
}

export function authHeader() {
    const userStr = localStorage.getItem('user');
    let user = null;
    if (userStr) {
      try {
          user = JSON.parse(userStr);
      } catch (e) {
          console.error("Lỗi parse user từ localStorage trong authHeader:", e);
          return {};
      }
    }
  
    if (user && user.accessToken) {
      return { 'Authorization': 'Bearer ' + user.accessToken };
    } else {
      return {};
    }
}

// Service cơ bản không có toast
const authService = {
    register,
    login,
    logout,
    getCurrentUser,
};

// Function để tạo phiên bản authService với toast
export const createAuthServiceWithToast = (toastService) => {
    // Tạo api instance với toast
    const apiWithToast = createApi(toastService);
    
    // Tạo các phương thức có hỗ trợ toast
    const loginWithToast = (username, password) => {
        const credentials = {
            username: username.trim(),
            password: password
        };
        
        return apiWithToast.post(API_URL + "login", credentials)
        .then(response => {
            if (response.data && response.data.accessToken) {
                localStorage.setItem("user", JSON.stringify(response.data));
                toastService.success("Đăng nhập thành công!");
            }
            return response.data;
        })
        .catch(error => {
            let errorMessage;
            
            if (error.response) {
                if (error.response.status === 401 || error.response.status === 403) {
                    errorMessage = "Tài khoản hoặc mật khẩu không chính xác";
                } else if (error.response.data && error.response.data.message) {
                    errorMessage = error.response.data.message;
                } else {
                    errorMessage = `Lỗi ${error.response.status}: ${error.response.statusText}`;
                }
            } else if (error.request) {
                errorMessage = "Không nhận được phản hồi từ máy chủ";
            } else {
                errorMessage = error.message || "Đã xảy ra lỗi khi đăng nhập";
            }
            
            toastService.error(errorMessage);
            
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            throw enhancedError;
        });
    };
    
    const registerWithToast = (username, email, password, firstName, lastName) => {
        return apiWithToast.post(API_URL + "register", {
            username,
            email,
            password,
            firstName,
            lastName
        })
        .then(response => {
            toastService.success("Đăng ký thành công! Vui lòng đăng nhập.");
            return response;
        })
        .catch(error => {
            let errorMessage = "Đăng ký thất bại";
            
            if (error.response && error.response.data) {
                errorMessage = error.response.data.message || errorMessage;
            }
            
            toastService.error(errorMessage);
            throw error;
        });
    };
    
    const logoutWithToast = () => {
        const user = getCurrentUser();
        localStorage.removeItem("user");
        
        return apiWithToast.post(API_URL + "logout", { username: user?.username })
            .then(() => {
                toastService.info("Đã đăng xuất");
            })
            .catch(() => {
                // Ngay cả khi API thất bại, vẫn cần xóa dữ liệu local và hiển thị thông báo
                toastService.info("Đã đăng xuất");
            });
    };
    
    // Trả về phiên bản service với toast
    return {
        register: registerWithToast,
        login: loginWithToast,
        logout: logoutWithToast,
        getCurrentUser
    };
};

export default authService;