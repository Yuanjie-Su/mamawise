const app = getApp()
import Logger from '../../utils/logger'
import { buildSystemPrompt } from '../../utils/systemPrompt'

Page({
  /**
   * 页面的初始数据
   */
  data: {
    showBotAvatar: true, // 是否在对话框左侧显示头像
    // 用户信息
    isLoggedIn: false,
    hasPersonalInfo: false,
    healthRecords: null,
    weatherInfo: {
      icon: '',
      description: '晴朗',
      temperature: '25'
    },
    solarTermInfo: '立夏',
    // 模型配置
    modelConfig: {
      type: "model", // 只支持model模式
      modelName: "deepseek", // 大模型服务商，例如：hunyuan、chatgpt等
      model: "deepseek-v3", // 具体使用的模型，例如：hunyuan-lite、hunyuan-pro等
      logo: "/images/profile.png", // 模型图标URL
      welcomeMessage: "您好，我是妈妈智慧助手，很高兴为您服务。请问有什么可以帮助您的吗？", // 欢迎语
      allowWebSearch: true, // 是否允许联网搜索
      systemPrompt: "" // 系统提示词，将在onLoad中设置
    }
  },

  // modelName: "deepseek", // 大模型服务商
  // model: "deepseek-r1", // 具体的模型版本

  // modelName: "deepseek", // 大模型服务商
  // model: "deepseek-v3", // 具体的模型版本
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    Logger.info('聊天页面加载')
    // 检查用户登录状态
    this.checkLoginStatus()
    // 获取天气和节气信息
    this.getWeatherInfo()
    this.getSolarTermInfo()
    // 生成系统提示词
    this.generateSystemPrompt()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {},

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    Logger.info('聊天页面显示')
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
    // 更新天气和节气信息
    this.getWeatherInfo()
    this.getSolarTermInfo()
    // 更新系统提示词
    this.generateSystemPrompt()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {},

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {},

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {},

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {},

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {},

  // 检查用户登录状态和个人信息
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn || false
    const hasPersonalInfo = app.globalData.hasPersonalInfo || false
    
    this.setData({
      isLoggedIn: isLoggedIn,
      hasPersonalInfo: hasPersonalInfo
    })
    
    // 如果用户已登录且已完善个人信息，加载健康记录
    if (isLoggedIn && hasPersonalInfo) {
      this.loadHealthRecords()
    } else {
      // 未登录或未完善个人信息时，清空健康记录
      this.setData({
        healthRecords: null
      })
    }
  },
  
  // 加载健康记录
  loadHealthRecords() {
    if (app.globalData.healthRecords) {
      this.setData({
        healthRecords: app.globalData.healthRecords
      })
      Logger.debug('健康记录加载成功', app.globalData.healthRecords)
    } else {
      Logger.warn('未找到健康记录数据')
    }
  },

  // 获取天气信息（模拟数据，实际应用中应该调用天气API）
  getWeatherInfo() {
    // 模拟天气数据
    const weatherTypes = [
      { icon: '/images/weather/sunny.png', description: '晴朗', temperature: '25' },
      { icon: '/images/weather/cloudy.png', description: '多云', temperature: '22' },
      { icon: '/images/weather/rainy.png', description: '小雨', temperature: '18' },
      { icon: '/images/weather/windy.png', description: '有风', temperature: '20' }
    ]
    
    // 随机选择一种天气（实际应用中应该根据用户位置获取真实天气）
    const randomIndex = Math.floor(Math.random() * weatherTypes.length)
    const weather = weatherTypes[randomIndex]
    
    this.setData({
      weatherInfo: weather
    })
  },
  
  // 获取节气信息（简化版）
  getSolarTermInfo() {
    // 获取当前日期
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    
    // 简化的节气判断
    let solarTerm = '立夏' // 默认值
    
    // 根据月份和日期判断节气（简化版）
    if (month === 5 && day <= 20) {
      solarTerm = '立夏'
    } else if (month === 5 && day > 20) {
      solarTerm = '小满'
    } else if (month === 6 && day <= 21) {
      solarTerm = '芒种'
    } else if (month === 6 && day > 21) {
      solarTerm = '夏至'
    }
    
    this.setData({
      solarTermInfo: solarTerm
    })
  },

  // 生成系统提示词
  generateSystemPrompt() {
    try {
      // 使用buildSystemPrompt函数生成系统提示词
      const systemPrompt = buildSystemPrompt({
        isLoggedIn: this.data.isLoggedIn,
        hasPersonalInfo: this.data.hasPersonalInfo,
        healthRecords: this.data.healthRecords,
        weatherInfo: this.data.weatherInfo,
        solarTermInfo: this.data.solarTermInfo
      })
      
      // 更新modelConfig中的systemPrompt
      this.setData({
        'modelConfig.systemPrompt': systemPrompt
      })
      
      Logger.info('系统提示词生成成功')
    } catch (error) {
      Logger.error('生成系统提示词时出错:', error)
    }
  }
}) 