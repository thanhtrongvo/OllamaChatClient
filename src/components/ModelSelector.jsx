import { useState, useEffect, useCallback } from 'react';
import { CpuChipIcon, XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

/**
 * Model Selector component as a modal for choosing different AI models
 * Shows model names along with their sizes
 */
function ModelSelector({
  selectedModel,
  onSelectModel,
  className = '',
  models = [], // Available models list
  fetchModels = null, // Function to fetch models
  isOpen = false,
  onClose = () => {}
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load models on component mount if a fetch function is provided
  useEffect(() => {
    const loadModels = async () => {
      if (fetchModels && isOpen) {
        setIsLoading(true);
        setError(null);
        
        try {
          await fetchModels();
        } catch (err) {
          console.error("Failed to load models:", err);
          setError("Không thể tải danh sách mô hình");
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadModels();
  }, [fetchModels, isOpen]);

  // Get display name for the currently selected model
  const getSelectedModelDisplay = useCallback(() => {
    const found = models.find(m => m.id === selectedModel || m.name === selectedModel);
    return found?.displayName || found?.name || selectedModel?.replace(':', ' ') || "Chọn model";
  }, [models, selectedModel]);

  // Format model size for display
  const formatModelSize = (size) => {
    if (!size) return null;
    // convert size B to GB
    let gbSize = size / 1000000000;

    // Convert size to string to handle number values
    const sizeStr = String(gbSize.toFixed(2));
    
    // Check if it already includes 'B' for billion
    return sizeStr.toLowerCase().includes('gb') ? sizeStr : `${sizeStr}GB`;
  };

  // Close modal with escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 ${className}`}>
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h3 className="text-lg font-medium flex items-center">
            <CpuChipIcon className="h-5 w-5 text-indigo-500 mr-2" />
            Chọn mô hình AI
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-full p-1"
            aria-label="Đóng"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-amber-500 mx-auto mb-2" />
              <p className="text-red-600 mb-3">{error}</p>
              <button 
                onClick={() => fetchModels && fetchModels()} 
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Thử lại
              </button>
            </div>
          ) : models.length === 0 ? (
            <div className="text-center py-8 text-gray-500">Không có mô hình nào</div>
          ) : (
            <div className="grid gap-3">
              {models.map(model => (
                <div
                  key={model.id || model.name}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    (selectedModel === model.id || selectedModel === model.name)
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}
                  onClick={() => {
                    onSelectModel(model.id || model.name);
                    onClose();
                  }}
                  aria-selected={selectedModel === model.id || model.name}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectModel(model.id || model.name);
                      onClose();
                    }
                  }}
                >
                  <div className="font-medium text-gray-800">{model.displayName || model.name}</div>
                  {model.size && (
                    <div className="text-sm text-gray-500 mt-1">
                      Kích thước: {formatModelSize(model.size)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 mr-2"
          >
            Đóng
          </button>
          <div className="inline-flex items-center text-sm text-gray-500">
            Model hiện tại: <span className="font-medium ml-1">{getSelectedModelDisplay()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelSelector;