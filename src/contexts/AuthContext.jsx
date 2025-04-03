import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import authService from "../services/authService";
import { useNavigate } from "react-router-dom";
import useToast from "../hooks/useToast";
import { createApi } from "../services/api";


// Create the AuthContext
const AuthContext = createContext();

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

// Auth Provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const toast = useToast();

    // Tạo instance API với toast service
    const apiWithToast = useMemo(() => createApi(toast), [toast]);

    // Function to handle token expiration
    const handleTokenExpiration = useCallback(() => {
        // Xóa dữ liệu user
        setUser(null);
        localStorage.removeItem('user');
        
        // Hiển thị thông báo toast
        toast.error("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        
        // Chuyển hướng về trang đăng nhập
        navigate("/login");
    }, [navigate, toast]);

    // Function to get user from storage - used in multiple places
    const getUserFromStorage = useCallback(() => {
        try {
            const userStr = localStorage.getItem('user');
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            console.error('Failed to parse stored user:', e);
            localStorage.removeItem('user');
            return null;
        }
    }, []);

    // Function to refresh the token session - only when explicitly needed
    const refreshSession = useCallback(async () => {
        try {
            // Get user data from storage
            const userData = getUserFromStorage();
            if (!userData?.refreshToken) {
                return null;
            }

            // Only refresh if there's a refresh token available
            const response = await authService.refreshToken(userData.refreshToken);
            
            // Update localStorage with new tokens
            const updatedUser = {
                ...userData,
                accessToken: response.accessToken,
                refreshToken: response.refreshToken
            };
            localStorage.setItem('user', JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            return updatedUser;
        } catch (error) {
            console.error('Error refreshing session:', error);
            // Clear user data on refresh failure and handle token expiration
            handleTokenExpiration();
            return null;
        }
    }, [getUserFromStorage, handleTokenExpiration]);

    // Configure the interceptor for handling 401 errors
    useEffect(() => {
        const responseInterceptor = apiWithToast.interceptors.response.use(
            response => response,
            error => {
                // Kiểm tra nếu lỗi là 401 Unauthorized
                if (error.response && error.response.status === 401) {
                    // Thử refresh token trước
                    refreshSession().then(refreshedUser => {
                        // Nếu không refresh được, xử lý token hết hạn
                        if (!refreshedUser) {
                            handleTokenExpiration();
                        }
                    }).catch(() => {
                        handleTokenExpiration();
                    });
                }
                return Promise.reject(error);
            }
        );

        // Cleanup function to eject the interceptor when the component unmounts
        return () => {
            apiWithToast.interceptors.response.eject(responseInterceptor);
        };
    }, [apiWithToast, handleTokenExpiration, refreshSession]);

    // On initial load, check if we have a stored user
    useEffect(() => {
        const initializeAuth = async () => {
            setLoading(true);
            try {
                // Simply get user from storage - no auto refresh here
                // The API interceptor will handle token refreshing when needed
                const userData = getUserFromStorage();
                
                // If userData exists, set the user state
                if (userData) {
                    setUser(userData);
                }
            } catch (error) {
                console.error('Error initializing auth:', error);
                localStorage.removeItem('user');
            } finally {
                setLoading(false);
            }
        };
        
        initializeAuth();
    }, [getUserFromStorage]);

    const login = useCallback(async (username, password) => {
        try {
            setLoading(true);
            const response = await authService.login(username, password);
            
            // Store user data
            setUser(response);
            localStorage.setItem('user', JSON.stringify(response));
            
            // Hiển thị thông báo đăng nhập thành công
            toast.success("Đăng nhập thành công!");
            
            return response;
        } catch (error) {
            // Hiển thị thông báo lỗi đăng nhập
            const errorMessage = error?.response?.data?.message || "Đăng nhập thất bại. Vui lòng kiểm tra thông tin đăng nhập.";
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const register = useCallback(async (registerData) => {
        try {
            setLoading(true);
            const { username, email, password, firstName, lastName } = registerData;
            const response = await authService.register(username, email, password, firstName, lastName);
            
            // Hiển thị thông báo đăng ký thành công
            toast.success("Đăng ký thành công! Vui lòng đăng nhập.");
            
            return response;
        } catch (error) {
            // Hiển thị thông báo lỗi đăng ký
            const errorMessage = error?.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.";
            toast.error(errorMessage);
            throw error;
        } finally {
            setLoading(false);
        }
    }, [toast]);

    const logout = useCallback(async () => {
        try {
            setLoading(true);
            await authService.logout();
            toast.success("Đăng xuất thành công!");
        } catch (error) {
            console.error('Logout error:', error);
            toast.error("Có lỗi xảy ra khi đăng xuất.");
        } finally {
            // Clear user data
            setUser(null);
            localStorage.removeItem('user');
            setLoading(false);
            // Redirect to login page after logout
            navigate("/login");
        }
    }, [navigate, toast]);

    const value = useMemo(() => ({
        user,
        loading,
        login,
        register,
        logout,
        refreshSession,
        handleTokenExpiration, // Export hàm xử lý token hết hạn
        isAuthenticated: !!user,
    }), [user, loading, login, register, logout, refreshSession, handleTokenExpiration]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};