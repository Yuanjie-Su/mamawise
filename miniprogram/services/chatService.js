/**
 * 聊天服务
 * 负责处理聊天记录的存储和管理
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'
import storageUtil from '../utils/storageUtil'

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig

/**
 * 保存聊天记录到云端
 * @param {number} messagesUnsavedNumber - 未保存的消息数量
 * @returns {Promise<void>}
 */
async function saveChatHistoryToCloud(messagesUnsavedNumber) {
  try {
    // 重置计数器
    await storageUtil.setStorage(STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER, 0)

    // 获取所有消息
    const messages = await storageUtil.getStorage(STORAGE_KEYS.CHAT_HISTORY, [])
    if (!messages || messages.length === 0) {
      return
    }

    // 调用云函数保存消息
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.ADD_CHAT_HISTORY,
      data: { messagesToSave: messages.slice(-messagesUnsavedNumber) },
    })

    Logger.info('保存聊天记录成功', res)

    // 检查保存结果
    if (!res || !res.result || !res.result.success) {
      Logger.error('保存聊天记录失败', res.error)
      // 如果保存失败，恢复计数器
      const currentUnsavedNumber = await storageUtil.getStorage(
        STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER,
        0
      )
      await storageUtil.setStorage(
        STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER,
        currentUnsavedNumber + messagesUnsavedNumber
      )
    }
  } catch (error) {
    Logger.error('保存聊天记录失败', error)
  }
}

/**
 * 从云数据库获取聊天记录
 * @returns {Promise<Array>} 聊天消息数组
 */
async function getChatHistoryFromCloud() {
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
 * @param {number} newMessagesNumber - 新增的消息数量
 * @returns {Promise<void>}
 */
async function saveChatHistoryToCache(messages, newMessagesNumber = 2) {
  try {
    // 保存消息到缓存
    await storageUtil.setStorage(STORAGE_KEYS.CHAT_HISTORY, messages)

    // 更新未保存计数器
    const unsavedCounter = await storageUtil.getStorage(
      STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER,
      0
    )
    await storageUtil.setStorage(
      STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER,
      unsavedCounter + newMessagesNumber
    )
  } catch (error) {
    Logger.error('保存聊天记录到缓存失败', error)
  }
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

  return [...messages, newMessage]
}

/**
 * 添加系统消息
 * @param {String} content - 消息内容
 * @param {Number} messageId - 消息ID
 * @returns {Object} 新创建的系统消息对象
 */
function createSystemMessage(content, messageId) {
  return {
    id: messageId,
    type: 'system',
    content: content,
    markdownContent: content, // 初始化与content相同
    formattedContent: '', // 初始化为空字符串，在chat.js中更新内容时会计算
  }
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
 * 保存笔记列表到云数据库
 * @returns {Promise<void>}
 */
async function saveNotesToCloud() {
  try {
    // 获取本地笔记数据
    const unsavedNotes = await storageUtil.getStorage(STORAGE_KEYS.NOTES, [])

    // 预先更新本地缓存状态
    await storageUtil.setStorage(STORAGE_KEYS.NOTES_CHANGED, false)

    if (unsavedNotes.length === 0) {
      return
    }

    // 调用云函数保存笔记
    const cloudRes = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.UPDATE_NOTES,
      data: { unsavedNotes },
    })

    if (!cloudRes || !cloudRes.result || !cloudRes.result.success) {
      Logger.error('保存笔记列表失败', cloudRes.error)
      // 如果保存失败，恢复本地缓存状态
      await storageUtil.setStorage(STORAGE_KEYS.NOTES_CHANGED, true)
    }

    Logger.info('保存笔记列表成功')
  } catch (error) {
    Logger.error('保存笔记列表失败', error)
    // 保存出错，恢复本地缓存状态
    await storageUtil.setStorage(STORAGE_KEYS.NOTES_CHANGED, true)
  }
}

/**
 * 清除聊天记录
 * @returns {Promise<void>}
 */
async function clearChatHistoryOnCloud() {
  try {
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.CLEAR_CHAT_HISTORY,
    })

    if (!res || !res.result || !res.result.success) {
      Logger.error('清除聊天记录失败', res.error)
    }
  } catch (error) {
    Logger.error('清除聊天记录失败', error)
  }
}

/**
 * 删除聊天记录
 * @param {string|number} messageId - 要删除的消息ID
 * @returns {Promise<void>}
 */
async function deleteChatHistoryOnCloud(messageId) {
  try {
    Logger.info('删除消息云端', messageId)
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.DELETE_CHAT_HISTORY,
      data: { messageId },
    })

    if (!res || !res.result || !res.result.success) {
      Logger.error('删除消息云端失败', res.error)
    } else {
      Logger.info('删除消息云端成功', res)
    }
  } catch (error) {
    Logger.error('删除消息云端失败', error)
  }
}

export default {
  saveChatHistoryToCloud,
  getChatHistoryFromCloud,
  saveChatHistoryToCache,
  addUserMessage,
  createSystemMessage,
  updateLastMessage,
  saveNotesToCloud,
  clearChatHistoryOnCloud,
  deleteChatHistoryOnCloud,
}
