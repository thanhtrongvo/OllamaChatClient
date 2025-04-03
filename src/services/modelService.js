import api from "./api"; 

// Cache cho models để tránh gọi API liên tục
let modelsCache = null;
let lastFetchTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // Cache trong 5 phút

const modelService = {
  listModels: async () => {
    const now = Date.now();
    
    // Sử dụng cache nếu còn hiệu lực
    if (modelsCache && (now - lastFetchTime < CACHE_TTL)) {
      console.log("Sử dụng danh sách models từ cache");
      return modelsCache;
    }
    
    try {
      console.log("Đang tải danh sách models từ API...");
      const response = await api.get("/api/ollama/models/available");
      
      // Kiểm tra cấu trúc dữ liệu trả về
      if (response.data?.models && Array.isArray(response.data.models)) {
        modelsCache = response.data.models;
      } else if (response.data && typeof response.data === 'object') {
        // Nếu trả về là object, thử chuyển đổi sang array
        if (Object.keys(response.data).length > 0) {
          modelsCache = Object.keys(response.data).map(key => ({
            name: key,
            ...response.data[key]
          }));
        }
      } else {
        modelsCache = response.data?.models || [];
      }
      
      // Cập nhật thời gian fetch
      lastFetchTime = now;
      return modelsCache;
    } catch (error) {
      console.error("Lỗi khi tải danh sách models:", error);
      // Nếu có lỗi nhưng có cache cũ, sử dụng cache cũ
      if (modelsCache) {
        console.warn("Sử dụng cache cũ do lỗi API");
        return modelsCache;
      }
      return []; // Trả về mảng rỗng nếu không có cache và API lỗi
    }
  },

  /**
   * Pull a model from the Ollama library.
   * @param modelName - The name of the model to pull.
   * @param insecure - If true, pull the model without SSL verification.
   * @returns tatus of the pull operation.
   */
  pullModel: async (modelName, insecure = false) => {
    const response = await api.post("/api/ollama/models/pull", {
      model: modelName,
      insecure,
      stream: false, // Giả sử chưa xử lý stream ở UI
    });
    return response.data;
  },

  /**
   * Get details about a specific model.
   * @param {string} modelName - The name of the model to get details for.
   * @returns {Promise<object>} Model details.
   */
  getModelDetails: async (modelName) => {
    // Encode tên model nếu nó chứa ký tự đặc biệt
    const response = await api.get(
      `/api/ollama/models/${encodeURIComponent(modelName)}`
    );
    return response.data;
  },

  /**
   * Delete a model.
   * @param {string} modelName - The name of the model to delete.
   * @returns {Promise<{ message: string }>} Confirmation message.
   */
  deleteModel: async (modelName) => {
    const response = await api.delete(
      `/api/ollama/models/${encodeURIComponent(modelName)}`
    );
    return response.data;
  },
};

export default modelService;
