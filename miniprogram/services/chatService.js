/**
 * 聊天服务
 * 负责处理聊天记录的存储和管理
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig

/**
 * 保存聊天记录
 * @param {Array} messagesToSave - 需要保存的聊天消息数组
 * @returns {Promise<void>}
 */
async function saveChatHistoryToCloud(messagesToSave) {
  try {
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.ADD_CHAT_HISTORY,
      data: { messagesToSave: messagesToSave },
    })
    if (!res || !res.result || !res.result.success) {
      return {
        success: false,
        error: res.error || 'cloudfunctions/addChatHistory: 云数据库添加聊天记录失败',
      }
    }
    return {
      success: true,
    }
  } catch (cloudError) {
    return {
      success: false,
      error: cloudError || 'chatService.saveChatHistory: 云数据库添加聊天记录失败',
    }
  }
}

/**
 * 从云数据库获取聊天记录
 * @returns {Promise<Array>} 聊天消息数组
 */
async function getChatHistoryFromCloud() {
  // 从云数据库获取
  try {
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.GET_CHAT_HISTORY,
    })
    if (res && res.result && res.result.messages) {
      return res.result.messages
    } else {
      Logger.error('获取聊天记录失败', res.error)
      return []
    }
  } catch (error) {
    Logger.error('获取聊天记录失败', error)
    return []
  }
}

/**
 * 从本地缓存获取聊天记录
 * @returns {Promise<Array>} 聊天消息数组
 */
async function getChatHistoryFromCache() {
  return new Promise(resolve => {
    try {
      const chatHistory = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY) || []
      resolve(chatHistory)
    } catch (error) {
      Logger.error('获取聊天记录失败', error)
      resolve([])
    }
  })
}

/**
 * 清空聊天记录
 * @returns {Promise<void>}
 */
function clearChatHistory() {
  return new Promise(resolve => {
    try {
      wx.removeStorageSync(STORAGE_KEYS.CHAT_HISTORY)
      resolve()
    } catch (error) {
      Logger.error('清空聊天记录失败', error)
      resolve()
    }
  })
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
  }

  const updatedMessages = [...messages, newMessage]

  return updatedMessages
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
  }

  const updatedMessages = [...messages, newMessage]

  return updatedMessages
}

/**
 * 更新最后一条消息内容
 * @param {String} content - 新的消息内容
 * @param {Array} messages - 当前消息数组
 * @returns {Array} 更新后的消息数组
 */
function updateLastMessage(content, messages) {
  if (messages.length === 0) {
    return messages
  }

  const updatedMessages = [...messages]
  updatedMessages[updatedMessages.length - 1].content = content

  return updatedMessages
}

export default {
  saveChatHistoryToCloud,
  getChatHistoryFromCloud,
  getChatHistoryFromCache,
  clearChatHistory,
  addUserMessage,
  addSystemMessage,
  updateLastMessage,
}
