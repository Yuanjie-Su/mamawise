/**
 * 智孕小程序
 *
 * 项目架构说明：
 * 1. 视图层 (View)：pages目录下的WXML和WXSS文件
 * 2. 控制层 (Controller)：pages目录下的JS文件，负责处理用户交互和视图更新
 * 3. 服务层 (Service)：services目录下的JS文件，负责业务逻辑和API调用
 * 4. 数据层 (Model)：models目录下的JS文件，负责数据结构定义和数据处理
 * 5. 工具层 (Utils)：utils目录下的JS文件，提供通用工具函数
 * 6. 配置层 (Config)：config目录下的JS文件，存储全局配置信息
 * 7. 组件层 (Components)：components目录下的自定义组件
 */

// app.js

import appConfig from './config/appConfig'
import chatService from './services/chatService'
import Logger from './utils/logger'

const { STORAGE_KEYS } = appConfig

App({
  async onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV, // 使用当前云环境
      traceUser: true, // 开启用户追踪
    })

    // 登录状态
    let isLoggedIn = wx.getStorageSync(STORAGE_KEYS.IS_LOGGED_IN) || false

    // 设置全局数据-登录状态
    this.globalData.isLoggedIn = isLoggedIn // 登录状态

    if (isLoggedIn) {
      // 已登录从本地存储获取提示词
      this.globalData.prompt_healthRecords = wx.getStorageSync(STORAGE_KEYS.PROMPT_HEALTH_RECORDS)

      wx.onAppHide(async () => {
        console.log('onAppHide')
        const chatHistory = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY)
        if (chatHistory && chatHistory.length > 0) {
          const unsavedNumber = this.globalData.messagesUnsavedNumber
          if (unsavedNumber > 0) {
            const result = await chatService.saveChatHistoryToCloud(chatHistory, unsavedNumber)
            if (result.success) {
              wx.setStorageSync(STORAGE_KEYS.UNSAVED_COUNTER, 0)
            }
          }
        }
      })
    }

    // 恢复未保存消息计数
    this.restoreUnsavedCounter()
  },

  onHide() {
    console.log('onHide')
    // 将本地已保存但未同步的历史消息保存到云端
    if (this.globalData.messagesUnsavedNumber > 0) {
      this.saveChatHistoryCacheToCloud()
    }
  },

  globalData: {
    isLoggedIn: false,
    troggleLogin: true,
    prompt_healthRecords: '',
    messagesUnsavedNumber: 0,
    _counterUpdateLock: false, // 计数器更新锁
    _saveOperationLock: false, // 保存操作锁
  },

  // 增加未保存消息计数
  incrementUnsavedCounter(count = 2) {
    if (this.globalData._counterUpdateLock) {
      Logger.warn('计数器锁定中，等待解锁...')
      // 使用setTimeout避免同步操作中的死锁
      setTimeout(() => this.incrementUnsavedCounter(count), 100)
      return
    }

    try {
      this.globalData._counterUpdateLock = true

      // 确保是有效数字
      const increment = Number(count) || 2

      // 读取当前值
      const currentCount = this.globalData.messagesUnsavedNumber || 0

      // 计算新值
      const newCount = currentCount + increment

      // 更新全局数据
      this.globalData.messagesUnsavedNumber = newCount

      // 异步保存到本地存储
      this.persistUnsavedCounter(newCount)

      Logger.info('增加未保存消息计数', increment, '当前计数:', newCount)
    } catch (error) {
      Logger.error('增加未保存消息计数失败', error)
    } finally {
      this.globalData._counterUpdateLock = false
    }
  },

  // 设置未保存消息计数
  setUnsavedCounter(previousCount) {
    if (this.globalData._counterUpdateLock) {
      Logger.warn('计数器锁定中，等待解锁...')
      setTimeout(() => this.setUnsavedCounter(previousCount), 100)
      return
    }

    try {
      this.globalData._counterUpdateLock = true

      const currentCount = this.globalData.messagesUnsavedNumber || 0
      // 设置计数
      let newCount = 0
      if (previousCount >= currentCount) {
        newCount = 0
      } else {
        newCount = currentCount - previousCount
      }

      // 更新全局数据
      this.globalData.messagesUnsavedNumber = newCount

      // 异步保存到本地存储
      this.persistUnsavedCounter(newCount)

      Logger.info('设置未保存消息计数', newCount)
    } catch (error) {
      Logger.error('设置未保存消息计数失败', error)
    } finally {
      this.globalData._counterUpdateLock = false
    }
  },

  // 从本地存储恢复计数
  restoreUnsavedCounter() {
    try {
      const savedCount = wx.getStorageSync(STORAGE_KEYS.UNSAVED_COUNTER)

      if (savedCount !== '' && !isNaN(Number(savedCount))) {
        this.globalData.messagesUnsavedNumber = Number(savedCount)
        Logger.info('恢复未保存消息计数', this.globalData.messagesUnsavedNumber)
      } else {
        this.globalData.messagesUnsavedNumber = 0
        Logger.info('未找到已保存的计数，初始化为0')
      }
    } catch (error) {
      Logger.error('恢复未保存消息计数失败', error)
      this.globalData.messagesUnsavedNumber = 0
    }
  },

  // 将计数持久化到本地存储
  persistUnsavedCounter(count) {
    try {
      wx.setStorage({
        key: STORAGE_KEYS.UNSAVED_COUNTER,
        data: count,
        fail: err => {
          Logger.error('保存未保存消息计数到本地失败', err)
        },
      })
    } catch (error) {
      Logger.error('持久化未保存消息计数失败', error)
    }
  },

  async saveChatHistoryCacheToCloud() {
    if (this.globalData._saveOperationLock) {
      // 等待锁释放
      Logger.info('saveChatHistoryCacheToCloud 等待锁释放...')
      setTimeout(() => this.saveChatHistoryCacheToCloud(), 100)
      return
    }

    // 上锁
    this.globalData._saveOperationLock = true

    try {
      wx.getStorage({
        key: STORAGE_KEYS.CHAT_HISTORY,
        success: async res => {
          if (res.data && res.data.length > 0) {
            const previousCount = this.globalData.messagesUnsavedNumber
            const result = await chatService.saveChatHistoryToCloud(res.data.slice(-previousCount))
            if (result.success) {
              Logger.info('云端保存成功，重置计数器')
              this.setUnsavedCounter(previousCount)
            } else {
              Logger.error('保存聊天记录到云端失败', result)
            }
          }
        },
        fail: err => {
          Logger.error('获取未同步历史消息失败', err)
        },
      })
    } catch (error) {
      Logger.error('保存未同步历史消息到云端失败', error)
    } finally {
      // 释放锁
      this.globalData._saveOperationLock = false
    }
  },
})
