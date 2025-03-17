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

    // 未保存消息计数
    let messagesUnsavedNumber = wx.getStorageSync(STORAGE_KEYS.UNSAVED_COUNTER) || 0

    if (isLoggedIn && messagesUnsavedNumber > 0) {
      chatService.saveChatHistoryToCloud(messagesUnsavedNumber)
    }

    if (isLoggedIn) {
      // 已登录从本地存储获取提示词
      this.globalData.prompt_healthRecords = wx.getStorageSync(STORAGE_KEYS.PROMPT_HEALTH_RECORDS)

      // 监听小程序隐藏事件
      wx.onAppHide(async () => {
        messagesUnsavedNumber = wx.getStorageSync(STORAGE_KEYS.UNSAVED_COUNTER)
        if (this.globalData.isLoggedIn && messagesUnsavedNumber > 0) {
          chatService.saveChatHistoryToCloud(messagesUnsavedNumber)
        }
      })
    }
  },

  globalData: {
    isLoggedIn: false,
    troggleLogin: true,
    prompt_healthRecords: '',
  },
})
