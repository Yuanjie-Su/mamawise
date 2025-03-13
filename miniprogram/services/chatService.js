/**
 * 聊天服务
 * 负责处理聊天记录的存储和管理
 */

import Logger from '../utils/logger';
import appConfig from '../config/appConfig';

const { STORAGE_KEYS, DEFAULT_AI_CONFIG } = appConfig;

/**
 * 保存聊天记录
 * @param {Array} messages - 聊天消息数组
 * @returns {Promise<void>}
 */
async function saveChatHistory(messages) {
  try {
    // 本地缓存
    wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY, messages);
  } catch (error) {
    Logger.error('保存聊天记录失败', error);
  }
}

/**
 * 获取聊天记录
 * @returns {Promise<Array>} 聊天消息数组
 */
function getChatHistory() {
  return new Promise((resolve) => {
    try {
      const chatHistory = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY) || [];
      resolve(chatHistory);
    } catch (error) {
      Logger.error('获取聊天记录失败', error);
      resolve([]);
    }
  });
} 

/**
 * 获取提示词
 * @returns {Promise<Object>} 提示词对象
 */
function getPrompt() {
  return new Promise((resolve) => {
    try {
      const prompt = wx.getStorageSync(STORAGE_KEYS.PROMPT);
      resolve(prompt || {
        'default_prompt': DEFAULT_AI_CONFIG.PROMPT,
        'health_prompt': ''
      });
    } catch (error) {
      Logger.error('获取提示词失败', error);
      resolve(
        {
          'default_prompt': DEFAULT_AI_CONFIG.PROMPT,
          'health_prompt': ''
        }
      );
    }
  });
}

/**
 * 清空聊天记录
 * @returns {Promise<void>}
 */
function clearChatHistory() {
  return new Promise((resolve) => {
    try {
      wx.removeStorageSync(STORAGE_KEYS.CHAT_HISTORY);
      resolve();
    } catch (error) {
      Logger.error('清空聊天记录失败', error);
      resolve();
    }
  });
}

/**
 * 添加用户消息
 * @param {String} content - 消息内容
 * @param {Array} messages - 当前消息数组
 * @returns {Array} 更新后的消息数组
 */
function addUserMessage(content, messages) {
  const newMessage = {
    id: messages.length + 1,
    type: 'user',
    content: content,
  };
  
  const updatedMessages = [...messages, newMessage];
  saveChatHistory(updatedMessages);
  
  return updatedMessages;
}

/**
 * 添加系统消息
 * @param {String} content - 消息内容
 * @param {Array} messages - 当前消息数组
 * @returns {Array} 更新后的消息数组
 */
function addSystemMessage(content, messages) {
  const newMessage = {
    id: messages.length + 1,
    type: 'system',
    content: content,
  };
  
  const updatedMessages = [...messages, newMessage];
  saveChatHistory(updatedMessages);
  
  return updatedMessages;
}

/**
 * 更新最后一条消息内容
 * @param {String} content - 新的消息内容
 * @param {Array} messages - 当前消息数组
 * @returns {Array} 更新后的消息数组
 */
function updateLastMessage(content, messages) {
  if (messages.length === 0) {
    return messages;
  }
  
  const updatedMessages = [...messages];
  updatedMessages[updatedMessages.length - 1].content = content;
  
  saveChatHistory(updatedMessages);
  return updatedMessages;
}

export default {
  saveChatHistory,
  getChatHistory,
  getPrompt,
  clearChatHistory,
  addUserMessage,
  addSystemMessage,
  updateLastMessage,
}; 