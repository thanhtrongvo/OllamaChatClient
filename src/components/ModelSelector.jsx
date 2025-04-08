import { useState, useEffect, useCallback, useRef } from 'react';
import { CpuChipIcon, ChevronDownIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';

/**
 * Model Selector component for choosing different AI models
 * Based on the ViVu Chat Compose repository design
 */
function ModelSelector({
  selectedModel,
  onSelectModel,
  className = '',
  models = [], // Available models list
  fetchModels = null // Function to fetch models
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Load models on component mount if a fetch function is provided
  useEffect(() => {
    const loadModels = async () => {
      if (fetchModels) {
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
  }, [fetchModels]);

  // Get display name for the currently selected model
  const getSelectedModelDisplay = useCallback(() => {
    const found = models.find(m => m.id === selectedModel || m.name === selectedModel);
    return found?.displayName || found?.name || selectedModel?.replace(':', ' ') || "Chọn model";
  }, [models, selectedModel]);

  // Format model size for display
  const formatModelSize = (size) => {
    if (!size) return null;
    
    // Convert size to string to handle number values
    const sizeStr = String(size);
    
    // Check if it already includes 'B' for billion
    return sizeStr.toLowerCase().includes('b') ? sizeStr : `${sizeStr}B`;
  };

  return (
    <div className={`relative ${className}`}>
      <button
        ref={buttonRef}
        className="flex items-center space-x-2 bg-white rounded-md px-3 py-2 border border-gray-300 hover:bg-gray-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-300"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading}
        aria-label={`Chọn mô hình AI: ${getSelectedModelDisplay()}`}
      >
        {error ? (
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
        ) : (
          <CpuChipIcon className="h-5 w-5 text-indigo-500" />
        )}
        
        <span className="text-sm font-medium truncate max-w-[120px]">
          {isLoading ? 'Đang tải...' : getSelectedModelDisplay()}
        </span>
        
        <ChevronDownIcon className="h-4 w-4 text-gray-500" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute left-0 z-1999 mt-1 w-56 origin-top-left rounded-md bg-white shadow-lg border border-gray-200"
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {error ? (
              <div className="px-4 py-2 text-sm text-red-600">
                {error}
                <button 
                  onClick={() => fetchModels && fetchModels()} 
                  className="block mt-1 text-indigo-600 hover:text-indigo-800"
                >
                  Thử lại
                </button>
              </div>
            ) : models.length === 0 && !isLoading ? (
              <div className="px-4 py-2 text-sm text-gray-500">Không có mô hình nào</div>
            ) : (
              models.map(model => (
                <div
                  key={model.id || model.name}
                  className={`px-4 py-2 text-sm cursor-pointer ${
                    (selectedModel === model.id || selectedModel === model.name)
                      ? 'bg-indigo-100 text-indigo-800'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => {
                    onSelectModel(model.id || model.name);
                    setIsOpen(false);
                  }}
                  aria-selected={selectedModel === model.id || selectedModel === model.name}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectModel(model.id || model.name);
                      setIsOpen(false);
                    }
                  }}
                >
                  <div className="font-medium">{model.displayName || model.name}</div>
                  
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ModelSelector;