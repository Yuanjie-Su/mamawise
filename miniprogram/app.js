/**
 * 妈妈智慧小程序
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

import appConfig from './config/appConfig';

const { STORAGE_KEYS } = appConfig;

App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: wx.cloud.DYNAMIC_CURRENT_ENV, // 使用当前云环境
      traceUser: true // 开启用户追踪
    })

    // 设置全局数据
    this.setGlobalData()
  },

  /** 
   * 设置全局数据
   */
  setGlobalData() {
    // 从本地存储获取用户登录状态
    const loginStatus = wx.getStorageSync(STORAGE_KEYS.LOGIN_STATUS)
    this.globalData.loginStatus = loginStatus

    // 从本地存储获取健康记录
    const healthRecords = wx.getStorageSync(STORAGE_KEYS.HEALTH_RECORDS)
    this.globalData.healthRecords = healthRecords
    this.globalData.hasHealthRecords = !!healthRecords
  },

  globalData: {
    loginStatus: false,
    hasHealthRecords: false,
    healthRecords: null,
  }
})