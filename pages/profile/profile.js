const app = getApp()
import Logger from '../../utils/logger'

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    menuList: [
      {
        id: 1,
        name: '我的收藏',
        icon: '/images/favorite.png',
        url: ''
      },
      {
        id: 2,
        name: '使用帮助',
        icon: '/images/help.png',
        url: ''
      },
      {
        id: 3,
        name: '开发者工具',
        icon: '/images/settings.png',
        url: '',
        action: 'viewDeveloperTools'
      },
      {
        id: 4,
        name: '设置',
        icon: '/images/settings.png',
        url: ''
      }
    ],
    // 开发者工具相关
    showDevPanel: false,
    activeDevTab: 'logs',
    logs: [],
    logFilter: 'ALL',
    logLevels: ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'],
    // 系统信息
    systemInfo: {},
    // 应用信息
    appInfo: {
      launchTime: '',
      memory: '0'
    }
  },

  onLoad() {
    Logger.info('个人页面加载')
    
    // 记录应用启动时间
    if (!getApp().globalData.launchTime) {
      getApp().globalData.launchTime = new Date().toLocaleString()
    }
    
    // 获取系统信息
    this.getSystemInfo()
    
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },
  
  onShow() {
    Logger.debug('个人页面显示')
  },

  // 获取系统信息
  getSystemInfo() {
    try {
      const systemInfo = wx.getSystemInfoSync()
      this.setData({
        systemInfo
      })
      Logger.debug('获取系统信息成功', systemInfo)
    } catch (e) {
      Logger.error('获取系统信息失败', e)
    }
  },
  
  // 获取应用信息
  getAppInfo() {
    const appInfo = {
      launchTime: getApp().globalData.launchTime || new Date().toLocaleString(),
      memory: '未知'
    }
    
    // 尝试获取内存信息（仅在某些平台支持）
    try {
      const performance = wx.getPerformance()
      if (performance && performance.getMemoryStats) {
        const memoryInfo = performance.getMemoryStats()
        if (memoryInfo && memoryInfo.jsHeapSizeLimit) {
          // 转换为MB并保留2位小数
          const jsHeapSizeUsed = memoryInfo.usedJSHeapSize / (1024 * 1024)
          const jsHeapSizeLimit = memoryInfo.jsHeapSizeLimit / (1024 * 1024)
          appInfo.memory = `${jsHeapSizeUsed.toFixed(2)}MB / ${jsHeapSizeLimit.toFixed(2)}MB`
        }
      }
    } catch (e) {
      Logger.warn('获取内存信息失败', e)
    }
    
    this.setData({
      appInfo
    })
    
    Logger.debug('获取应用信息成功', appInfo)
    return appInfo
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        Logger.info('用户登录成功', { nickname: res.userInfo.nickName })
      }
    })
  },

  navigateTo(e) {
    const item = e.currentTarget.dataset.item
    
    // 如果有特定操作，执行对应函数
    if (item.action && this[item.action]) {
      this[item.action]()
      return
    }
    
    // 否则执行普通导航
    const url = item.url
    if (url) {
      wx.navigateTo({
        url: url
      })
      Logger.debug('用户导航到', { url })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none'
      })
      Logger.debug('用户尝试访问开发中的功能')
    }
  },

  showAbout() {
    wx.showModal({
      title: '关于妈妈智慧',
      content: '妈妈智慧是一款专为孕妇设计的AI精准问答助手，能够根据您的健康记录提供个性化的建议和解答。\n\n版本：1.0.0\n开发者：MamaWise团队',
      showCancel: false
    })
    Logger.info('用户查看关于信息')
  },
  
  // 跳转到咨询页面
  navigateToChat() {
    wx.switchTab({
      url: '/pages/chat/chat'
    })
    Logger.debug('用户从个人页面跳转到咨询页面')
  },
  
  // 跳转到健康档案页面
  navigateToRecords() {
    wx.switchTab({
      url: '/pages/records/records'
    })
    Logger.debug('用户从个人页面跳转到健康档案页面')
  },
  
  // 查看开发者工具
  viewDeveloperTools() {
    this.loadLogs()
    this.getAppInfo() // 获取最新的应用信息
    
    this.setData({
      showDevPanel: true,
      activeDevTab: 'logs'
    })
    Logger.info('开发者打开开发工具面板')
  },
  
  // 关闭开发者工具面板
  closeDevPanel() {
    this.setData({
      showDevPanel: false
    })
    Logger.debug('开发者关闭开发工具面板')
  },
  
  // 切换开发者工具标签
  switchDevTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      activeDevTab: tab
    })
    
    if (tab === 'logs') {
      this.loadLogs()
    } else if (tab === 'debug') {
      // 刷新应用信息
      this.getAppInfo()
    }
    
    Logger.debug('开发者切换工具标签', { tab })
  },
  
  // 加载日志
  loadLogs() {
    Logger.readLogFile((err, content) => {
      if (err) {
        wx.showToast({
          title: '加载日志失败',
          icon: 'none'
        })
        return
      }
      
      // 解析日志内容
      const logLines = content.split('\n').filter(line => line.trim())
      const parsedLogs = logLines.map(line => {
        try {
          // 解析日志行
          // 格式: [timestamp] [LEVEL] message - data
          const timestampMatch = line.match(/\[(.*?)\]/)
          const levelMatch = line.match(/\]\s+\[(.*?)\]/)
          const restOfLine = line.replace(/\[.*?\]\s+\[.*?\]\s+/, '')
          const dataIndex = restOfLine.indexOf(' - ')
          
          const timestamp = timestampMatch ? timestampMatch[1] : ''
          const level = levelMatch ? levelMatch[1] : ''
          const message = dataIndex > -1 ? restOfLine.substring(0, dataIndex) : restOfLine
          const data = dataIndex > -1 ? restOfLine.substring(dataIndex + 3) : null
          
          return { timestamp, level, message, data }
        } catch (e) {
          return { timestamp: '', level: 'ERROR', message: '解析日志行失败', data: line }
        }
      })
      
      this.setData({
        logs: parsedLogs,
        logFilter: 'ALL'
      })
    })
  },
  
  // 筛选日志
  filterLogs(e) {
    const level = e.currentTarget.dataset.level
    
    Logger.readLogFile((err, content) => {
      if (err) {
        wx.showToast({
          title: '加载日志失败',
          icon: 'none'
        })
        return
      }
      
      // 解析日志内容
      const logLines = content.split('\n').filter(line => line.trim())
      let parsedLogs = logLines.map(line => {
        try {
          const timestampMatch = line.match(/\[(.*?)\]/)
          const levelMatch = line.match(/\]\s+\[(.*?)\]/)
          const restOfLine = line.replace(/\[.*?\]\s+\[.*?\]\s+/, '')
          const dataIndex = restOfLine.indexOf(' - ')
          
          const timestamp = timestampMatch ? timestampMatch[1] : ''
          const level = levelMatch ? levelMatch[1] : ''
          const message = dataIndex > -1 ? restOfLine.substring(0, dataIndex) : restOfLine
          const data = dataIndex > -1 ? restOfLine.substring(dataIndex + 3) : null
          
          return { timestamp, level, message, data }
        } catch (e) {
          return { timestamp: '', level: 'ERROR', message: '解析日志行失败', data: line }
        }
      })
      
      // 过滤日志
      if (level !== 'ALL') {
        parsedLogs = parsedLogs.filter(log => log.level === level)
      }
      
      this.setData({
        logs: parsedLogs,
        logFilter: level
      })
    })
    
    Logger.debug('开发者筛选日志', { level })
  },
  
  // 导出日志
  exportLogs() {
    Logger.exportLogFile((err, content) => {
      if (err) {
        wx.showToast({
          title: '导出日志失败',
          icon: 'none'
        })
        return
      }
      
      // 在实际应用中，这里可以实现导出到文件或发送到服务器的功能
      console.log('导出日志', content)
      
      // 尝试将日志保存到本地文件系统
      try {
        const fs = wx.getFileSystemManager()
        const filePath = `${wx.env.USER_DATA_PATH}/exported_logs_${new Date().getTime()}.txt`
        
        fs.writeFileSync(filePath, content, 'utf8')
        
        // 保存成功后，提示用户
        wx.showModal({
          title: '日志导出成功',
          content: `日志已导出到: ${filePath}\n共${content.split('\n').filter(line => line.trim()).length}条记录`,
          showCancel: false
        })
        
        Logger.info('开发者导出了日志', { filePath })
      } catch (e) {
        // 如果保存失败，仅显示日志条数
        wx.showModal({
          title: '日志导出',
          content: '日志已导出，共' + content.split('\n').filter(line => line.trim()).length + '条记录',
          showCancel: false
        })
        
        Logger.warn('导出日志到文件失败', e)
      }
    })
  },
  
  // 清空日志
  clearLogs() {
    wx.showModal({
      title: '清空日志',
      content: '确定要清空所有日志记录吗？',
      success: (res) => {
        if (res.confirm) {
          Logger.clearLogs()
          this.setData({
            logs: []
          })
          
          wx.showToast({
            title: '日志已清空',
            icon: 'success'
          })
          
          Logger.info('开发者清空了日志')
        }
      }
    })
  }
}) 