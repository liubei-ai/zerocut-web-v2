import { ref, type Ref } from 'vue';
import { getChatHistory } from '@/api/videoProjectApi';
import { type ChatMessage, type TextAssistantMessage } from '@/types/workspace';

export function useChatMessages() {
  const messages: Ref<ChatMessage[]> = ref([]);

  /**
   * Initialize messages with empty array
   */
  const initMessages = () => {
    messages.value = [];
  };

  /**
   * Add a new message to the chat
   */
  const addMessage = (message: ChatMessage) => {
    messages.value.push(message);
  };

  /**
   * Add multiple messages to the chat
   */
  const addMessages = (newMessages: ChatMessage[]) => {
    messages.value.push(...newMessages);
  };

  /**
   * Create a user message
   */
  const createUserMessage = (content: string): ChatMessage => {
    return {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
  };


  /**
   * Create an text assistant message
   */
  const createAssistantMessage = (content: string): ChatMessage => {
    return {
      id: `assistant-${Date.now()}`,
      role: 'assistant',
      content: [{
        type: 'text',
        userResponse: content,
      }],
      timestamp: new Date().toISOString(),
    };
  };

  /**
   * Add a user message to the chat
   */
  const addUserMessage = (content: string) => {
    const message = createUserMessage(content);
    addMessage(message);
    return message;
  };

  /**
   * Add an assistant message to the chat
   */
  const addAssistantMessage = (content: string) => {
    const message = createAssistantMessage(content);
    addMessage(message);
    return message;
  };

  /**
   * Load chat history from API
   */
  const loadChatHistory = async (projectId: string) => {
    try {
      const chatData = await getChatHistory(projectId, 'all');
      const chatHistory = chatData.chatHistory;

      let useNewMessage = false;

      try {
        const oldLastMessage = messages.value[messages.value.length - 1];
        const newLastMessage = chatHistory[chatHistory.length - 1];

        if (Array.isArray(chatHistory) && chatHistory.length > messages.value.length) {
          useNewMessage = true;
        } else if (Array.isArray(chatHistory) && chatHistory.length < messages.value.length) {
          useNewMessage = false;
        } else if (oldLastMessage.role === 'assistant'
          && newLastMessage.role === 'assistant') {
          useNewMessage = oldLastMessage.content.length <= newLastMessage.content.length;
        }
      } catch (e) {

      }
      if (useNewMessage) {
        messages.value = chatHistory;

      }

    } catch (error) {
      console.error('❌ 加载聊天记录失败:', error);
      throw error;
    }
  };

  /**
   * Find the latest message by role
   */
  const findLatestMessageByRole = (role: ChatMessage['role']): ChatMessage | undefined => {
    return messages.value
      .filter(msg => msg.role === role)
      .pop();
  };

  /**
 * Update a message by ID
 */
  // const updateMessage = (messageId: string, updates: Partial<ChatMessage>) => {
  //   const messageIndex = messages.value.findIndex(msg => msg.id === messageId);
  //   if (messageIndex !== -1) {
  //     messages.value[messageIndex] = { ...messages.value[messageIndex], ...updates };
  //   }
  // };

  /**
   * Remove a message by ID
   */
  const removeMessage = (messageId: string) => {
    const messageIndex = messages.value.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
      messages.value.splice(messageIndex, 1);
    }
  };

  /**
   * Clear all messages
   */
  const clearMessages = () => {
    messages.value = [];
  };

  /**
   * Get messages count
   */
  const getMessagesCount = () => {
    return messages.value.length;
  };

  /**
   * Get messages by role
   */
  const getMessagesByRole = (role: ChatMessage['role']) => {
    return messages.value.filter(msg => msg.role === role);
  };

  return {
    // State
    messages,

    // Methods
    initMessages,
    addMessage,
    addMessages,
    createUserMessage,
    createAssistantMessage,
    addUserMessage,
    addAssistantMessage,
    loadChatHistory,
    findLatestMessageByRole,
    removeMessage,
    clearMessages,
    getMessagesCount,
    getMessagesByRole,
  };
}