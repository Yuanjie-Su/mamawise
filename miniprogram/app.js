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
App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'cloud1-3g8wu7ny156401ea', // 替换为你的云开发环境 ID
      traceUser: true
    })

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 获取用户登录状态
    this.checkLoginStatus()
  },

  // 检查用户登录状态
  checkLoginStatus() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync('userInfo')
    const hasUserInfo = !!userInfo
    const hasPersonalInfo = wx.getStorageSync('hasPersonalInfo') || false

    // 更新全局数据
    this.globalData.userInfo = userInfo || null
    this.globalData.isLoggedIn = hasUserInfo
    this.globalData.hasPersonalInfo = hasPersonalInfo

    // 如果用户已登录且已完善个人信息，加载健康记录
    if (hasUserInfo && hasPersonalInfo) {
      this.loadHealthRecords()
    }
  },

  // 用户登录
  login(userInfo) {
    // 保存用户信息到本地存储
    wx.setStorageSync('userInfo', userInfo)
    
    // 更新全局数据
    this.globalData.userInfo = userInfo
    this.globalData.isLoggedIn = true
    
    // 检查是否已完善个人信息
    this.checkPersonalInfo()
  },

  // 用户登出
  logout() {
    // 清除本地存储中的用户信息
    wx.removeStorageSync('userInfo')
    
    // 更新全局数据
    this.globalData.userInfo = null
    this.globalData.isLoggedIn = false
    this.globalData.hasPersonalInfo = false
    this.globalData.healthRecords = null
  },

  // 检查是否已完善个人信息
  checkPersonalInfo() {
    const hasPersonalInfo = wx.getStorageSync('hasPersonalInfo') || false
    this.globalData.hasPersonalInfo = hasPersonalInfo
    
    // 如果已完善个人信息，加载健康记录
    if (hasPersonalInfo) {
      this.loadHealthRecords()
    }
  },

  // 完善个人信息
  updatePersonalInfo(personalInfo) {
    // 保存个人信息到本地存储
    wx.setStorageSync('personalInfo', personalInfo)
    wx.setStorageSync('hasPersonalInfo', true)
    
    // 更新全局数据
    this.globalData.hasPersonalInfo = true
    
    // 更新健康记录中的孕周和预产期
    if (!this.globalData.healthRecords) {
      // 如果健康记录不存在，初始化它
      this.loadHealthRecords()
    }
    
    // 确保健康记录中的孕周和预产期与个人信息同步
    if (this.globalData.healthRecords && personalInfo.pregnancyWeek && personalInfo.dueDate) {
      // 更新孕周和预产期
      this.globalData.healthRecords.pregnancy = {
        ...this.globalData.healthRecords.pregnancy,
        week: personalInfo.pregnancyWeek,
        dueDate: personalInfo.dueDate
      }
      
      // 如果有末次产检时间，更新它
      if (personalInfo.lastCheckupDate) {
        this.globalData.healthRecords.pregnancy.lastCheckup = personalInfo.lastCheckupDate
      } else {
        // 如果没有末次产检时间，设置为空字符串
        this.globalData.healthRecords.pregnancy.lastCheckup = ''
      }
      
      // 如果有过敏信息，更新它
      if (personalInfo.allergies) {
        // 将逗号分隔的过敏信息转换为数组
        const allergiesArray = personalInfo.allergies.split(',').map(item => item.trim()).filter(item => item)
        this.globalData.healthRecords.allergies = allergiesArray
      } else {
        // 如果没有过敏信息，设置为空数组
        this.globalData.healthRecords.allergies = []
      }
      
      // 如果有饮食偏好，更新它
      if (personalInfo.dietPreferences) {
        // 将逗号分隔的饮食偏好转换为数组
        const dietPreferencesArray = personalInfo.dietPreferences.split(',').map(item => item.trim()).filter(item => item)
        this.globalData.healthRecords.dietPreferences = dietPreferencesArray
      } else {
        // 如果没有饮食偏好，设置为空数组
        this.globalData.healthRecords.dietPreferences = []
      }
      
      // 保存更新后的健康记录
      wx.setStorageSync('healthRecords', this.globalData.healthRecords)
    }
  },

  // 加载健康记录
  loadHealthRecords() {
    // 尝试从本地存储获取健康记录
    const storedRecords = wx.getStorageSync('healthRecords')
    
    if (storedRecords) {
      // 如果本地存储中有健康记录，使用它
      this.globalData.healthRecords = storedRecords
    } else {
      // 否则使用演示数据
      this.globalData.healthRecords = this.globalData.demoHealthRecords
      
      // 如果用户已完善个人信息，更新健康记录中的孕周和预产期
      const personalInfo = wx.getStorageSync('personalInfo')
      if (personalInfo) {
        // 更新孕周和预产期
        if (personalInfo.pregnancyWeek && personalInfo.dueDate) {
          this.globalData.healthRecords.pregnancy = {
            ...this.globalData.healthRecords.pregnancy,
            week: personalInfo.pregnancyWeek,
            dueDate: personalInfo.dueDate
          }
        }
        
        // 更新末次产检时间
        if (personalInfo.lastCheckupDate) {
          this.globalData.healthRecords.pregnancy.lastCheckup = personalInfo.lastCheckupDate
        } else {
          this.globalData.healthRecords.pregnancy.lastCheckup = ''
        }
        
        // 更新过敏信息
        if (personalInfo.allergies) {
          const allergiesArray = personalInfo.allergies.split(',').map(item => item.trim()).filter(item => item)
          this.globalData.healthRecords.allergies = allergiesArray
        } else {
          this.globalData.healthRecords.allergies = []
        }
        
        // 如果有饮食偏好，更新它
        if (personalInfo.dietPreferences) {
          // 将逗号分隔的饮食偏好转换为数组
          const dietPreferencesArray = personalInfo.dietPreferences.split(',').map(item => item.trim()).filter(item => item)
          this.globalData.healthRecords.dietPreferences = dietPreferencesArray
        } else {
          // 如果没有饮食偏好，设置为空数组
          this.globalData.healthRecords.dietPreferences = []
        }
        
        // 保存更新后的健康记录
        wx.setStorageSync('healthRecords', this.globalData.healthRecords)
      }
    }
  },

  globalData: {
    userInfo: null,
    isLoggedIn: false,
    hasPersonalInfo: false,
    healthRecords: null,
    // 用于存储用户的健康记录
    // 实际应用中应该从服务器获取
    demoHealthRecords: {
      pregnancy: {
        week: 24,
        dueDate: '2024-12-15',
        lastCheckup: ''
      },
      vitals: {
        bloodPressure: [
          { date: '2024-06-01', value: '120/80' },
          { date: '2024-05-15', value: '118/78' }
        ],
        weight: [
          { date: '2024-06-01', value: 65 },
          { date: '2024-05-15', value: 64 }
        ],
        bloodSugar: [
          { date: '2024-06-01', value: 5.2 },
          { date: '2024-05-15', value: 5.0 }
        ]
      },
      medications: [
        { name: '叶酸', dosage: '0.4mg', frequency: '每日一次' },
        { name: '铁剂', dosage: '60mg', frequency: '每日一次' }
      ],
      allergies: [],
      checkupRecords: [],
      checkupAnalysis: '',
      dietPreferences: []
    }
  }
}) 