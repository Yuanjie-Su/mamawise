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

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig

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

    if (!isLoggedIn) {
      return
    }

    // 未保存消息计数
    let chatHistoryUnsavedCounter =
      wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER) || 0
    // 同步聊天记录
    if (chatHistoryUnsavedCounter > 0) {
      chatService.saveChatHistoryToCloud(chatHistoryUnsavedCounter)
      Logger.info('登录时聊天记录已保存')
    }

    // 同步笔记列表
    let isNotesChanged = wx.getStorageSync(STORAGE_KEYS.NOTES_CHANGED) || false
    if (isNotesChanged) {
      chatService.saveNotesToCloud()
      Logger.info('登录时笔记列表已保存')
    }

    // 同步提示词
    const healthRecordsPrompt = wx.getStorageSync(STORAGE_KEYS.HEALTH_RECORDS_PROMPT)
    this.globalData.healthRecordsPrompt = healthRecordsPrompt
    const healthRecordsPromptChanged = wx.getStorageSync(STORAGE_KEYS.HEALTH_RECORDS_PROMPT_CHANGED)
    if (healthRecordsPromptChanged) {
      wx.setStorageSync(STORAGE_KEYS.HEALTH_RECORDS_PROMPT_CHANGED, false)
      wx.cloud
        .callFunction({
          name: CLOUD_FUNCTIONS.UPDATE_PROMPT,
          data: {
            healthRecordsPrompt: healthRecordsPrompt,
          },
        })
        .then(() => {
          Logger.info('登录时健康记录提示词已保存')
        })
        .catch(err => {
          wx.setStorageSync(STORAGE_KEYS.HEALTH_RECORDS_PROMPT_CHANGED, true)
          Logger.error('登录时健康记录提示词保存失败', err)
        })
    }
  },

  onHide() {
    Logger.info('小程序隐藏')
    if (!this.globalData.isLoggedIn) {
      return
    }

    // 同步聊天记录
    const currentChatHistoryUnsavedCounter = wx.getStorageSync(
      STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER
    )
    Logger.info('小程序隐藏时聊天记录未保存计数', currentChatHistoryUnsavedCounter)
    if (currentChatHistoryUnsavedCounter > 0) {
      chatService.saveChatHistoryToCloud(currentChatHistoryUnsavedCounter)
      Logger.info('小程序隐藏时聊天记录已保存')
    }

    // 同步笔记列表
    const currentIsNotesChanged = wx.getStorageSync(STORAGE_KEYS.NOTES_CHANGED)
    Logger.info('小程序隐藏时笔记列表变化', currentIsNotesChanged)
    if (currentIsNotesChanged) {
      chatService.saveNotesToCloud()
    }

    // 同步提示词
    const currentHealthRecordsPrompt = wx.getStorageSync(STORAGE_KEYS.HEALTH_RECORDS_PROMPT)
    Logger.info('小程序隐藏时健康记录提示词', currentHealthRecordsPrompt)
    if (currentHealthRecordsPrompt) {
      wx.setStorageSync(STORAGE_KEYS.HEALTH_RECORDS_PROMPT_CHANGED, false)
      wx.cloud
        .callFunction({
          name: CLOUD_FUNCTIONS.UPDATE_PROMPT,
          data: { healthRecordsPrompt: currentHealthRecordsPrompt },
        })
        .then(() => {
          Logger.info('小程序隐藏时健康记录提示词已同步')
        })
        .catch(err => {
          wx.setStorageSync(STORAGE_KEYS.HEALTH_RECORDS_PROMPT_CHANGED, true)
          Logger.error('小程序隐藏时健康记录提示词同步失败', err)
        })
    }
  },

  globalData: {
    isLoggedIn: false,
    troggleLogin: true,
    healthRecordsPrompt: '',
  },
})
