// src/contexts/ChatContext.jsx
import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import chatService from '../services/chatService';

// Create the context
const ChatContext = createContext(undefined);

// Action types as constants for better maintainability
const ACTIONS = {
  SET_MESSAGES: 'SET_MESSAGES',
  ADD_MESSAGE: 'ADD_MESSAGE',
  UPDATE_MESSAGE: 'UPDATE_MESSAGE',
  SET_TYPING: 'SET_TYPING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_MESSAGES: 'CLEAR_MESSAGES',
  SET_SAVING: 'SET_SAVING',
  SET_ACTIVE_CHAT: 'SET_ACTIVE_CHAT',
  SET_CHAT_HISTORY: 'SET_CHAT_HISTORY',
  ADD_CHAT_TO_HISTORY: 'ADD_CHAT_TO_HISTORY',
  UPDATE_CHAT_IN_HISTORY: 'UPDATE_CHAT_IN_HISTORY',
  SET_LOADING_HISTORY: 'SET_LOADING_HISTORY',
  REMOVE_CHAT_FROM_HISTORY: 'REMOVE_CHAT_FROM_HISTORY',
  SET_API_AVAILABLE: 'SET_API_AVAILABLE',
  SET_AVAILABLE_MODELS: 'SET_AVAILABLE_MODELS', // Thêm action cho danh sách models
  SET_CURRENT_MODEL: 'SET_CURRENT_MODEL', // Thêm action cho model hiện tại
  SET_LOADING_MODELS: 'SET_LOADING_MODELS', // Thêm action cho trạng thái loading models
};

// Initial state
const initialState = {
  messages: [],
  isTyping: false,
  error: null,
  isSaving: false,
  activeChatId: null,   
  chatTitle: 'New Chat',
  chatHistory: [],
  isLoadingHistory: false,
  isApiAvailable: true,
  availableModels: [], // Thêm danh sách models
  currentModel: null,  // Thêm model hiện tại
  isLoadingModels: false, // Thêm trạng thái loading models
};

/**
 * Reducer function to handle state updates
 * @param {Object} state - Current state
 * @param {Object} action - Action with type and payload
 * @returns {Object} New state
 */
const chatReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_MESSAGES: {
      // Convert all IDs to numbers for consistency
      const cleanMessages = action.payload.map(msg => ({
        ...msg,
        id: msg.id !== undefined ? Number(msg.id) : msg.id
      }));
      return { ...state, messages: cleanMessages };
    }

    case ACTIONS.ADD_MESSAGE: {
      // Ensure ID is a number and prevent duplicates
      const newMessage = { ...action.payload, id: Number(action.payload.id) };
      if (state.messages.some(msg => msg.id === newMessage.id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, newMessage] };
    }

    case ACTIONS.UPDATE_MESSAGE: {
      const targetId = Number(action.payload.id);
      const updates = { ...action.payload.updates };
      if (updates.id !== undefined) {
        updates.id = Number(updates.id);
      }
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg.id === targetId ? { ...msg, ...updates } : msg
        ),
      };
    }

    case ACTIONS.SET_ACTIVE_CHAT:
      return {
        ...state,
        activeChatId: action.payload.id !== null ? Number(action.payload.id) : null,
        chatTitle: action.payload.title || 'New Chat'
      };

    case ACTIONS.SET_CHAT_HISTORY: {
      const cleanHistory = action.payload.map(chat => ({
        ...chat,
        id: chat.id !== undefined ? Number(chat.id) : chat.id
      }));
      return { ...state, chatHistory: cleanHistory };
    }

    case ACTIONS.ADD_CHAT_TO_HISTORY: {
      const newChatItem = { ...action.payload, id: Number(action.payload.id) };
      if (state.chatHistory.some(chat => chat.id === newChatItem.id)) {
        return state;
      }
      return { ...state, chatHistory: [newChatItem, ...state.chatHistory] };
    }

    case ACTIONS.UPDATE_CHAT_IN_HISTORY: {
      const updateId = Number(action.payload.id);
      const chatUpdates = { ...action.payload.updates };
      if (chatUpdates.id !== undefined) {
        chatUpdates.id = Number(chatUpdates.id);
      }
      return {
        ...state,
        chatHistory: state.chatHistory.map(chat =>
          chat.id === updateId ? { ...chat, ...chatUpdates } : chat
        )
      };
    }

    case ACTIONS.REMOVE_CHAT_FROM_HISTORY:
      return {
        ...state,
        chatHistory: state.chatHistory.filter(chat => chat.id !== Number(action.payload))
      };

    // Thêm các action mới cho model
    case ACTIONS.SET_AVAILABLE_MODELS:
      return { ...state, availableModels: action.payload };
      
    case ACTIONS.SET_CURRENT_MODEL:
      return { ...state, currentModel: action.payload };
      
    case ACTIONS.SET_LOADING_MODELS:
      return { ...state, isLoadingModels: action.payload };

    // Simple state updates
    case ACTIONS.SET_TYPING:
      return { ...state, isTyping: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload };

    case ACTIONS.CLEAR_MESSAGES:
      return { ...state, messages: [] };

    case ACTIONS.SET_SAVING:
      return { ...state, isSaving: action.payload };

    case ACTIONS.SET_LOADING_HISTORY:
      return { ...state, isLoadingHistory: action.payload };

    case ACTIONS.SET_API_AVAILABLE:
      return { ...state, isApiAvailable: action.payload };
    
    default:
      return state;
  }
};

/**
 * Chat Provider Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @param {string} [props.defaultModelId='gemma3:4b'] - Default AI model ID
 */
export const ChatProvider = ({ children, defaultModelId = 'gemma3:4b' }) => {
  // Ref to store the abort function for active streaming requests
  const abortStreamRef = useRef(null);
  
  // Ref to track retry attempts for API calls
  const retryAttemptsRef = useRef(0);
  const maxRetries = 3;
  
  // Setup reducer for state management
  const [state, dispatch] = useReducer(chatReducer, initialState);

  // Cleanup function for aborting any active streams when component unmounts
  useEffect(() => {
    return () => {
      if (abortStreamRef.current) {
        console.log("ChatProvider Unmount: Aborting active stream.");
        abortStreamRef.current();
        abortStreamRef.current = null;
      }
    };
  }, []);
  
  // Load available models when the component mounts
  useEffect(() => {
    loadAvailableModels();
    // Đặt model mặc định
    dispatch({ type: ACTIONS.SET_CURRENT_MODEL, payload: defaultModelId });
  }, [defaultModelId]);

  /**
   * Load chat history from the server
   * @param {boolean} force - Whether to force reload even if API was marked as unavailable
   */
  const loadChatHistory = useCallback(async (force = false) => {
    // Skip if already loading or if the API has been marked as unavailable
    if (state.isLoadingHistory || (!force && !state.isApiAvailable)) return;
    
    dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: true });
    
    // Only clear error on forced refresh
    if (force) {
      dispatch({ type: ACTIONS.SET_ERROR, payload: null });
      retryAttemptsRef.current = 0;
    }
    
    try {
      const response = await chatService.getUserChats();
      dispatch({ 
        type: ACTIONS.SET_CHAT_HISTORY, 
        payload: response.data.content || [] 
      });
      
      // Reset retry counter on success
      retryAttemptsRef.current = 0;
      dispatch({ type: ACTIONS.SET_API_AVAILABLE, payload: true });
      
    } catch (error) {
      console.error('Error loading chat history:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to load chat history';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      
      // Track failed attempts
      retryAttemptsRef.current += 1;
      
      // If we've tried multiple times, mark API as unavailable to prevent constant retries
      if (retryAttemptsRef.current >= maxRetries) {
        console.warn(`API appears to be unavailable after ${maxRetries} attempts. Pausing automatic retries.`);
        dispatch({ type: ACTIONS.SET_API_AVAILABLE, payload: false });
      }
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: false });
    }
  }, [state.isLoadingHistory, state.isApiAvailable]);
  
  /**
   * Tải danh sách các model AI có sẵn
   */
  const loadAvailableModels = useCallback(async () => {
    if (state.isLoadingModels) return;
    
    dispatch({ type: ACTIONS.SET_LOADING_MODELS, payload: true });
    
    try {
      const models = await chatService.listModels();
      dispatch({ type: ACTIONS.SET_AVAILABLE_MODELS, payload: models });
      
      // Nếu chưa có current model hoặc model hiện tại không nằm trong danh sách
      if (!state.currentModel || !models.some(m => m.id === state.currentModel || m.name === state.currentModel)) {
        // Đặt model đầu tiên làm mặc định
        if (models.length > 0) {
          dispatch({ type: ACTIONS.SET_CURRENT_MODEL, payload: models[0].id || models[0].name });
        }
      }
    } catch (error) {
      console.error('Error loading models:', error);
      dispatch({ type: ACTIONS.SET_ERROR, payload: 'Failed to load AI models' });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING_MODELS, payload: false });
    }
  }, [state.isLoadingModels, state.currentModel]);
  
  /**
   * Thay đổi model AI đang sử dụng
   * @param {string} modelId - ID của model muốn chọn
   */
  const selectModel = useCallback((modelId) => {
    dispatch({ type: ACTIONS.SET_CURRENT_MODEL, payload: modelId });
  }, []);

  /**
   * Select a chat and load its messages
   * @param {number|string} chatId - ID of the chat to select
   */
  const selectChat = useCallback(async (chatId) => {
    if (chatId === state.activeChatId) return;
    
    // Abort any active stream
    if (abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
      dispatch({ type: ACTIONS.SET_TYPING, payload: false });
    }
    
    dispatch({ type: ACTIONS.CLEAR_MESSAGES });
    dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: true });
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    
    const numericChatId = Number(chatId);
    
    try {
      // Find chat in history to set title immediately
      const chatFromHistory = state.chatHistory.find(chat => 
        chat.id === numericChatId
      );
      const chatTitle = chatFromHistory?.title || 'Loading Chat...';
      
      dispatch({ 
        type: ACTIONS.SET_ACTIVE_CHAT, 
        payload: { id: numericChatId, title: chatTitle } 
      });
      
      // Load chat messages from server
      const response = await chatService.getChatMessages(numericChatId);
      
      // Format messages for display
      const formattedMessages = (response.data || []).map(msg => ({
        id: Number(msg.id),
        role: msg.role, // Preserve original role
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        thinking: false,
        think: msg.think || '', // Add thinking content if available
        thinkingTime: msg.thinkingTime // Add thinking time if available
      }));
      
      dispatch({ type: ACTIONS.SET_MESSAGES, payload: formattedMessages });
      
      // Get the full chat details including title
      const chatDetails = await chatService.getChatMessages(numericChatId);
      if (chatDetails?.data?.title) {
        dispatch({ 
          type: ACTIONS.SET_ACTIVE_CHAT, 
          payload: { 
            id: numericChatId, 
            title: chatDetails.data.title 
          } 
        });
      }
      
      // Set the current model to the one used by this chat if available
      if (chatFromHistory?.model) {
        dispatch({ type: ACTIONS.SET_CURRENT_MODEL, payload: chatFromHistory.model });
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to load chat';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      dispatch({ type: ACTIONS.SET_ACTIVE_CHAT, payload: { id: null, title: 'New Chat' } });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: false });
    }
  }, [state.activeChatId, state.chatHistory]);

  /**
   * Create a new chat
   * @param {boolean} createInDatabase - Whether to create the chat in the database
   * @param {string} model - Model ID to use for the chat
   * @returns {Object|null} The created chat or null if creation fails
   */
  const createNewChat = useCallback(async (createInDatabase = true, model) => {
    // Abort any active stream
    if (abortStreamRef.current) {
      abortStreamRef.current(); 
      abortStreamRef.current = null;
      dispatch({ type: ACTIONS.SET_TYPING, payload: false });
    }
    
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    dispatch({ type: ACTIONS.CLEAR_MESSAGES });
    
    const useModelId = model || state.currentModel || defaultModelId;
    
    if (createInDatabase) {
      dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: true });
      
      try {
        const response = await chatService.createChat(useModelId);
        const newChat = response.data;
        
        dispatch({ type: ACTIONS.ADD_CHAT_TO_HISTORY, payload: newChat });
        dispatch({ 
          type: ACTIONS.SET_ACTIVE_CHAT, 
          payload: { id: newChat.id, title: newChat.title } 
        });
        
        return newChat;
      } catch (error) {
        console.error('Error creating chat:', error);
        const errorMessage = error?.response?.data?.message || error.message || 'Failed to create chat';
        dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
        dispatch({ type: ACTIONS.SET_ACTIVE_CHAT, payload: { id: null, title: 'New Chat' } });
        return null;
      } finally {
        dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: false });
      }
    } else {
      dispatch({ type: ACTIONS.SET_ACTIVE_CHAT, payload: { id: null, title: 'New Chat' } });
      return null;
    }
  }, [state.currentModel, defaultModelId]);

  /**
   * Update a message in the state
   * @param {number|string} messageId - ID of the message to update
   * @param {Object} updates - Updates to apply to the message
   */
  const updateMessage = useCallback((messageId, updates) => {
    dispatch({ 
      type: ACTIONS.UPDATE_MESSAGE, 
      payload: { id: Number(messageId), updates } 
    });
  }, []);
 /**
   * Save message to the backend and update its state
   * @param {number|string} chatId - ID of the chat
   * @param {Object} messageObject - Message data (with temporary ID)
   * @returns {Promise<Object|null>} Saved message from backend or null if save fails
   */
  const saveMessageToBackend = useCallback(async (chatId, messageObject) => {
    const numericChatId = Number(chatId);
    if (!numericChatId || !messageObject?.content) {
      console.warn("Cannot save message, invalid chatId or content", { chatId, messageObject });
      return null;
    }

    const tempId = messageObject.id; // Store temporary ID

    try {
      dispatch({ type: ACTIONS.SET_SAVING, payload: true });

      const actualContent = String(messageObject.content).trim();
      const role = messageObject.role?.toUpperCase() || 'USER'; // Default to USER

      console.log(`[saveMessageToBackend] Saving ${role} message (tempId: ${tempId}):`,
        actualContent.substring(0, 50) + (actualContent.length > 50 ? '...' : ''));

      // Prepare content with thinking if available - tư ViVu Chat
      let contentToSave = actualContent;
      if (role === 'ASSISTANT' && messageObject.think) {
        contentToSave = `<think>${messageObject.think}</think>${actualContent}`;
      }

      // Create message object for API
      const apiMessage = {
        content: contentToSave,
        role: role
      };

      // Send to API
      const response = await chatService.sendMessage(numericChatId, contentToSave);
      const savedMessage = response.data;

      if (!savedMessage || typeof savedMessage !== 'object' || savedMessage.id === undefined) {
        throw new Error("Invalid response received from save message API");
      }

      console.log(`[saveMessageToBackend] Received saved message (ID: ${savedMessage.id})`);

      // *** FIX: Explicitly define updates for the message ***
      const updates = {
        id: Number(savedMessage.id), // Use the real ID from the backend
        content: typeof savedMessage.content === 'string' ? savedMessage.content : JSON.stringify(savedMessage.content), // Ensure content is string
        role: savedMessage.role?.toUpperCase() || role, // Use role from backend or original
        timestamp: new Date(savedMessage.createdAt || Date.now()), // Use accurate timestamp
        model: savedMessage.model || messageObject.model, // Update model if provided
        // Keep other potential properties from original message if not overwritten by savedMessage
        thinking: false, // Ensure thinking is false after saving
        think: messageObject.think || '', // Preserve thinking content
        thinkingTime: messageObject.thinkingTime || undefined, // Preserve thinking time
        error: null, // Clear any previous error on this message
      };

      // Update the message in state using its temporary ID
      updateMessage(tempId, updates);

      // Update chat title for the first user message
      // Check based on messages currently in state *before* this update completes might be tricky
      // Consider updating title based on a flag or after state settles
      const isFirstUserMessage = state.messages.filter(m => m.role === 'USER').length <= 1;
      if (role === 'USER' && isFirstUserMessage) {
         // Simple title update based on content
         const truncatedTitle = actualContent.length > 50
              ? actualContent.substring(0, 47) + '...'
              : actualContent;
         if (state.chatTitle === 'New Chat' || state.chatTitle === 'Loading Chat...') {
             dispatch({
                 type: ACTIONS.SET_ACTIVE_CHAT,
                 payload: { id: numericChatId, title: truncatedTitle }
             });
             dispatch({
                 type: ACTIONS.UPDATE_CHAT_IN_HISTORY,
                 payload: { id: numericChatId, updates: { title: truncatedTitle } }
             });
         }
      }

      return savedMessage; // Return the message object from the backend

    } catch (error) {
      console.error(`Error saving message (tempId: ${tempId}):`, error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to save message';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      // Update the original message with an error flag
      updateMessage(tempId, { error: errorMessage, thinking: false });
      return null;
    } finally {
      dispatch({ type: ACTIONS.SET_SAVING, payload: false });
    }
  }, [state.messages, state.chatTitle, updateMessage]); // Added dependencies

  /**
   * Send a message and handle the response
   * @param {string} content - Message content
   * @param {string} model - Model ID to use
   */
  const sendMessage = useCallback(async (content) => {
    // Validate input and state
    if (!content.trim() || state.isTyping || state.isSaving) {
      return;
    }
    
    // Abort any active stream
    if (abortStreamRef.current) {
      abortStreamRef.current();
    }
    
    dispatch({ type: ACTIONS.SET_TYPING, payload: true });
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    
    // Use current model from state
    const useModelId = state.currentModel || defaultModelId;
    
    // Create temporary IDs for new messages (negative numbers for non-saved messages)
    const userMessageId = -Date.now();
    const assistantMessageId = userMessageId - 1;
    
    // Create user message object
    const userMessage = {
      id: userMessageId,
      role: 'USER',
      content,
      timestamp: new Date(),
      thinking: false,
      think: ''
    };
    
    // Create or get chat
    let currentChatId = state.activeChatId;
    let isNewChat = false;
    
    if (!currentChatId) {
      const newChat = await createNewChat(true, useModelId);
      if (!newChat) {
        dispatch({ type: ACTIONS.SET_TYPING, payload: false });
        return;
      }
      currentChatId = newChat.id;
      isNewChat = true;
    }
    
    // Add user message to UI
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: userMessage });
    
    try {
      // Save user message to backend
      await saveMessageToBackend(currentChatId, userMessage);
      
      // If new chat created, refresh chat list after a delay
      if (isNewChat) {
        setTimeout(() => {
          loadChatHistory();
        }, 500);
      }
    } catch (error) {
      console.error('Error saving user message:', error);
      // Continue conversation even if saving fails
    }
    
    // Create assistant message placeholder
    const assistantMessage = {
      id: assistantMessageId,
      role: 'ASSISTANT',
      content: '',
      timestamp: new Date(),
      thinking: true,
      think: ''
    };
    
    // Add assistant placeholder to UI
    dispatch({ type: ACTIONS.ADD_MESSAGE, payload: assistantMessage });
    
    // Prepare message history for API
    const currentMessages = [...state.messages, userMessage];
    const messagesToSend = currentMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Prepare request and state tracking
    const request = { model: useModelId, messages: messagesToSend };
    let finalAssistantContent = '';
    let finalAssistantThinking = '';
    let savedAssistantResponse = false;
    
    // Handle incoming stream messages
    const handleStreamMessage = (enhancedResponse) => {
      finalAssistantContent = enhancedResponse.message?.content || '';
      finalAssistantThinking = enhancedResponse.think || '';
      
      // Update assistant message with latest content
      updateMessage(assistantMessageId, {
        content: enhancedResponse.message?.content || '',
        thinking: !!enhancedResponse.thinking,
        think: enhancedResponse.think || '',
        timestamp: new Date(enhancedResponse.created_at || Date.now()),
        thinkingStartTime: enhancedResponse.thinkingStartTime,
        thinkingTime: enhancedResponse.thinkingTime
      });
      
      // When stream completes
      if (enhancedResponse.done && !savedAssistantResponse) {
        // Preserve thinking info
        if (enhancedResponse.think && enhancedResponse.thinkingTime) {
          updateMessage(assistantMessageId, {
            thinking: false,
            thinkingTime: enhancedResponse.thinkingTime
          });
        }
        
        dispatch({ type: ACTIONS.SET_TYPING, payload: false });
        abortStreamRef.current = null;
        
        // Save AI response to backend
        savedAssistantResponse = true;
        
        if (finalAssistantContent.trim() && currentChatId) {
          try {
            // Create message object for saving
            const messageToSave = {
              id: assistantMessageId,
              role: 'ASSISTANT',
              content: finalAssistantContent,
              think: finalAssistantThinking,
              thinkingTime: enhancedResponse.thinkingTime
            };
            
            // Save message
            saveMessageToBackend(currentChatId, messageToSave)
              .catch(err => console.error('Error saving AI response:', err));
          } catch (err) {
            console.error('Error preparing AI response for saving:', err);
          }
        } else if (!finalAssistantContent.trim()) {
          // If empty response, remove the assistant message
          dispatch({ 
            type: ACTIONS.SET_MESSAGES, 
            payload: state.messages.filter(m => m.id !== assistantMessageId)
          });
        }
      }
    };
    
    // Handle stream errors
    const handleStreamError = (error) => {
      console.error("Stream Error:", error);
      dispatch({ type: ACTIONS.SET_TYPING, payload: false });
      dispatch({ type: ACTIONS.SET_ERROR, payload: error.message || 'Stream failed' });
      
      // Update assistant message with error
      updateMessage(assistantMessageId, {
        content: `I'm sorry, I encountered an error: ${error.message || 'Unknown error'}`,
        thinking: false
      });
      
      abortStreamRef.current = null;
    };
    
    // Start streaming request and store abort function
    abortStreamRef.current = chatService.startStreamingRequest(
      request,
      handleStreamMessage,
      handleStreamError
    );
  }, [
    state.isTyping, 
    state.isSaving, 
    state.activeChatId, 
    state.messages,
    state.currentModel,
    defaultModelId,
    createNewChat,
    saveMessageToBackend,
    updateMessage,
    loadChatHistory
  ]);

  /**
   * Delete a chat
   * @param {number|string} chatId - ID of the chat to delete
   */
  const deleteChat = useCallback(async (chatId) => {
    const numericChatId = Number(chatId);
    
    if (!numericChatId || state.isLoadingHistory) {
      return;
    }
    
    // If deleting active chat, abort any stream
    if (numericChatId === state.activeChatId && abortStreamRef.current) {
      abortStreamRef.current();
      abortStreamRef.current = null;
      dispatch({ type: ACTIONS.SET_TYPING, payload: false });
    }
    
    // Store original history for rollback if needed
    const originalHistory = [...state.chatHistory];
    
    // Remove from UI immediately
    dispatch({ type: ACTIONS.REMOVE_CHAT_FROM_HISTORY, payload: numericChatId });
    
    // If deleting active chat, clear UI
    if (numericChatId === state.activeChatId) {
      dispatch({ type: ACTIONS.CLEAR_MESSAGES });
      dispatch({ 
        type: ACTIONS.SET_ACTIVE_CHAT, 
        payload: { id: null, title: 'New Chat' } 
      });
    }
    
    try {
      // Delete from backend
      await chatService.deleteChat(numericChatId);
    } catch (error) {
      console.error('Error deleting chat:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to delete chat';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
      
      // Restore chat history on failure
      dispatch({ type: ACTIONS.SET_CHAT_HISTORY, payload: originalHistory });
    }
  }, [state.activeChatId, state.chatHistory, state.isLoadingHistory]);

  /**
   * Clear the error state
   */
  const dismissError = useCallback(() => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
  }, []);

  /**
   * Clear all messages in the current chat
   */
  const clearMessages = useCallback(() => {
    if (state.activeChatId) {
      console.warn("Clearing messages for chat:", state.activeChatId);
    }
    dispatch({ type: ACTIONS.CLEAR_MESSAGES });
  }, [state.activeChatId]);

  /**
   * Load messages for the active chat
   */
  const loadMessagesForActiveChat = useCallback(async () => {
    if (!state.activeChatId) return;
    
    dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: true });
    dispatch({ type: ACTIONS.SET_ERROR, payload: null });
    
    try {
      const response = await chatService.getChatMessages(state.activeChatId);
      
      // Format messages for display
      const formattedMessages = (response.data || []).map(msg => ({
        id: Number(msg.id),
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.createdAt),
        thinking: false,
        think: msg.think || '', // Add thinking content if available
        thinkingTime: msg.thinkingTime // Add thinking time if available
      }));
      
      dispatch({ type: ACTIONS.SET_MESSAGES, payload: formattedMessages });
    } catch (error) {
      console.error('Error loading messages for active chat:', error);
      const errorMessage = error?.response?.data?.message || error.message || 'Failed to load messages';
      dispatch({ type: ACTIONS.SET_ERROR, payload: errorMessage });
    } finally {
      dispatch({ type: ACTIONS.SET_LOADING_HISTORY, payload: false });
    }
  }, [state.activeChatId]);

  // Load messages for active chat when it changes
  useEffect(() => {
    if (state.activeChatId) {
      loadMessagesForActiveChat();
    }
  }, [state.activeChatId]); // Only depend on activeChatId, not the function itself

  // Load chat history on first render
  useEffect(() => {
    loadChatHistory();
  }, []); // Empty dependency array to run only once on mount
  
  // Create context value
  const contextValue = useMemo(() => ({
    ...state,
    sendMessage,
    clearMessages,
    dismissError,
    createNewChat,
    loadChatHistory,
    selectChat,
    deleteChat,
    loadAvailableModels,
    selectModel, // Thêm hàm chọn model
  }), [
    state,
    sendMessage,
    clearMessages,
    dismissError,
    createNewChat,
    loadChatHistory,
    selectChat,
    deleteChat,
    loadAvailableModels,
    selectModel
  ]);

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

/**
 * Custom hook for consuming the Chat context
 * @returns {Object} Chat context value
 */
export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};