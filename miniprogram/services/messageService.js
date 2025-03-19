/**
 * 消息服务
 * 负责处理消息的操作，如复制、分享、保存图片和添加笔记等
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'
import storageUtil from '../utils/storageUtil'
import textUtil from '../utils/textUtil'
import canvasUtil from '../utils/canvasUtil'

const { STORAGE_KEYS } = appConfig

/**
 * 复制消息内容到剪贴板
 * @param {string} content - 要复制的内容
 * @returns {Promise<void>}
 */
function copyMessage(content) {
  return new Promise((resolve, reject) => {
    if (!content) {
      wx.showToast({
        title: '内容为空',
        icon: 'none',
        duration: 1500,
      })
      reject(new Error('内容为空'))
      return
    }

    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500,
        })
        resolve()
      },
      fail: err => {
        Logger.error('复制消息失败', err)
        wx.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 1500,
        })
        reject(err)
      },
    })
  })
}

/**
 * 添加笔记
 * @param {string} content - 笔记内容
 * @param {string} messageId - 消息ID
 * @param {boolean} isLoggedIn - 用户登录状态
 * @returns {Promise<boolean>} 添加笔记是否成功
 */
async function addNote(content, messageId, isLoggedIn) {
  // 检查登录状态
  if (!isLoggedIn) {
    return new Promise(resolve => {
      wx.showModal({
        title: '提示',
        content: '请先登录，才能添加笔记',
        confirmText: '去登录',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            // 跳转到个人中心页面
            wx.switchTab({
              url: '/pages/profile/profile',
            })
          }
          resolve(false)
        },
      })
    })
  }

  try {
    Logger.info('添加笔记：', content)

    // 准备笔记数据
    const { title, content: contentProcessed } = textUtil.extractTitleAndContent(content)
    const now = new Date()
    const newNote = {
      id: Date.now().toString(),
      title,
      content: contentProcessed,
      date: textUtil.formatDate(now),
      timestamp: now.getTime(),
    }

    // 获取现有笔记列表
    let notes = []
    try {
      const res = await storageUtil.getStorage(STORAGE_KEYS.NOTES)
      notes = res || []
    } catch (error) {
      // 如果没有笔记，使用空数组
      notes = []
    }

    // 添加到笔记列表
    notes.push(newNote)

    // 保存到本地存储
    return new Promise((resolve, reject) => {
      storageUtil
        .setStorage(STORAGE_KEYS.NOTES, notes)
        .then(() => {
          wx.showToast({
            title: '添加笔记成功',
            icon: 'success',
          })
          // 更新本地缓存中笔记列表发生变化
          wx.setStorageSync(STORAGE_KEYS.NOTES_CHANGED, true)
          resolve(true)
        })
        .catch(err => {
          Logger.error('添加笔记失败', err)
          wx.showToast({
            title: '添加笔记失败',
            icon: 'none',
          })
          reject(err)
        })
    })
  } catch (error) {
    Logger.error('添加笔记失败', error)
    wx.showToast({
      title: '添加笔记失败',
      icon: 'none',
    })
    return false
  }
}

/**
 * 保存消息为图片
 * @param {Object} message - 消息对象
 * @param {Object} component - 组件实例
 * @returns {Promise<boolean>} 保存图片是否成功
 */
async function saveMessageToImage(message, component) {
  try {
    const tempFilePath = await canvasUtil.generateShareImage(
      message,
      { titleExtractor: textUtil.extractTitleAndContent },
      component
    )

    if (tempFilePath) {
      await canvasUtil.saveImageToAlbum(tempFilePath)
      return true
    }
    return false
  } catch (error) {
    Logger.error('保存图片失败', error)
    wx.showToast({
      title: '保存失败',
      icon: 'none',
      duration: 1500,
    })
    return false
  }
}

/**
 * 分享消息
 * @param {Object} options - 分享选项
 * @returns {Object} 分享配置
 */
function shareMessage(options = {}) {
  const {
    title = '智孕 - 您的孕期健康顾问',
    path = '/pages/chat/chat',
    imageUrl = '/images/share-cover.png',
    content = '与AI助手的智能对话',
  } = options

  return {
    title,
    path,
    imageUrl,
    content,
  }
}

/**
 * 处理消息长按操作
 * @param {Object} e - 事件对象
 * @param {Component} component - 组件实例
 * @returns {void}
 */
function handleMessageLongPress(e, component) {
  // 必要的数据检查
  if (!e || !e.currentTarget || !e.currentTarget.dataset || !component) {
    return
  }

  // 如果正在加载，不处理
  if (component.data.isLoading) return

  const messageId = e.currentTarget.dataset.id
  const messageType = e.currentTarget.dataset.type

  // 获取点击位置坐标
  const touchY = e.changedTouches[0].clientY

  try {
    // 使用新API获取窗口信息
    const windowInfo = wx.getWindowInfo()
    const windowHeight = windowInfo.windowHeight

    // 查找消息
    const messageIndex = component.data.messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1) return

    const message = component.data.messages[messageIndex]

    component.setData({
      showMessageActionMenu: true,
      selectedMessageId: messageId,
      selectedMessageType: messageType,
      selectedMessageContent: message.content,
      selectedMessageIndex: messageIndex,
      menuPosition: touchY,
    })
  } catch (err) {
    Logger.error('获取窗口信息失败', err)
  }
}

export default {
  copyMessage,
  addNote,
  saveMessageToImage,
  shareMessage,
  handleMessageLongPress,
}
