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
async function saveChatHistoryToCloud(messagesUnsavedNumber) {
  try {
    const messages = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY) || []
    if (!messages || messages.length === 0) {
      return
    }
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.ADD_CHAT_HISTORY,
      data: { messagesToSave: messages.slice(-messagesUnsavedNumber) },
    })
    if (!res || !res.result || !res.result.success) {
      Logger.error('保存聊天记录失败', res.error)
    }
    const currentUnsavedNumber = wx.getStorageSync(STORAGE_KEYS.UNSAVED_COUNTER) || 0
    const newUnsavedNumber =
      messagesUnsavedNumber <= currentUnsavedNumber
        ? currentUnsavedNumber - messagesUnsavedNumber
        : 0
    wx.setStorageSync(STORAGE_KEYS.UNSAVED_COUNTER, newUnsavedNumber)
  } catch (cloudError) {
    Logger.error('保存聊天记录失败', cloudError)
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
 * 保存聊天记录到本地缓存
 * @param {Array} messages - 聊天消息数组
 */
async function saveChatHistoryToCache(messages, newMessagesNumber = 2) {
  await wx.setStorage({
    key: STORAGE_KEYS.CHAT_HISTORY,
    data: messages,
  })
  const unsavedCounter = wx.getStorageSync(STORAGE_KEYS.UNSAVED_COUNTER) || 0
  wx.setStorageSync(STORAGE_KEYS.UNSAVED_COUNTER, unsavedCounter + newMessagesNumber)
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
function createSystemMessage(content, messageId) {
  const newMessage = {
    id: messageId,
    type: 'system',
    content: content,
  }

  return newMessage
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

/**
 * 保存收藏列表到云数据库
 */
async function saveFavoritesToCloud() {
  const res = await wx.getStorage({
    key: STORAGE_KEYS.FAVORITES,
  })
  const unsavedFavorites = res.data || []

  // 预先更新本地缓存中收藏列表已保存
  wx.setStorageSync(STORAGE_KEYS.FAVORITES_CHANGED, false)

  const cloudRes = await wx.cloud.callFunction({
    name: CLOUD_FUNCTIONS.UPDATE_FAVORITES,
    data: { unsavedFavorites },
  })

  if (!cloudRes || !cloudRes.result || !cloudRes.result.success) {
    Logger.error('保存收藏列表失败', cloudRes.error)
    // 如果保存失败，则恢复本地缓存中收藏列表已保存
    wx.setStorageSync(STORAGE_KEYS.FAVORITES_CHANGED, true)
  }
}

export default {
  saveChatHistoryToCloud,
  getChatHistoryFromCloud,
  saveChatHistoryToCache,
  addUserMessage,
  createSystemMessage,
  updateLastMessage,
  saveFavoritesToCloud,
}
