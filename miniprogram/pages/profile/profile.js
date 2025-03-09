const app = getApp()
import Logger from '../../utils/logger'
import solarTermService from '../../services/solarTermService'

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    hasPersonalInfo: false,
    personalInfo: {},
    showPersonalInfoForm: false,
    menuList: [
      {
        id: 1,
        name: '我的收藏',
        icon: '/images/favorite.png',
        url: '/pages/favorites/favorites'
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
        url: '/pages/settings/settings'
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
    },
    // 表单数据
    formData: {
      age: null,
      pregnancyWeek: null,
      dueDate: '',
      height: null,
      prePregnancyWeight: null,
      lastCheckupDate: '',
      allergies: '',
      dietPreferences: '',
      checkupRecords: [],
      checkupAnalysis: ''
    },
    // 年龄范围：15-60岁
    ageRange: Array.from({length: 46}, (_, i) => i + 15),
    ageIndex: 22, // 默认37岁
    // 孕周范围：1-45周
    pregnancyWeekRange: Array.from({length: 45}, (_, i) => i + 1),
    pregnancyWeekIndex: 22, // 默认23周
    // 身高范围：140-200cm
    heightRange: Array.from({length: 61}, (_, i) => i + 140),
    heightIndex: 30, // 默认170cm
    // 体重范围：30-120kg
    weightRange: Array.from({length: 91}, (_, i) => i + 30),
    weightIndex: 30, // 默认60kg
    // 当前日期，用于日期选择器的最大值
    today: new Date().toISOString().split('T')[0],
    // 日历数据
    calendarData: {
      year: '',
      month: '',
      day: '',
      weekday: ''
    },
    // 天气信息
    weatherInfo: {
      icon: '',
      temperature: '--'
    },
    // 节气信息
    solarTermInfo: '',
  },

  onLoad() {
    Logger.info('个人页面加载')
    
    // 记录应用启动时间
    if (!getApp().globalData.launchTime) {
      getApp().globalData.launchTime = new Date().toLocaleString()
    }
    
    // 获取系统信息和应用信息
    this.getSystemInfo()
    this.getAppInfo()
    
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
    
    // 检查登录状态和个人信息
    this.checkLoginStatus()
    
    // 初始化日历数据
    this.initCalendarData()
    
    // 获取节气信息
    this.updateSolarTerm()
  },
  
  onShow() {
    Logger.info('个人页面显示');
    
    // 每次显示页面时检查登录状态
    this.checkLoginStatus();
    
    // 初始化日历数据
    this.initCalendarData();
    
    // 获取节气信息
    this.updateSolarTerm();
  },
  
  // 检查登录状态和个人信息
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    const hasPersonalInfo = app.globalData.hasPersonalInfo
    
    this.setData({
      hasUserInfo: isLoggedIn,
      userInfo: app.globalData.userInfo || {},
      hasPersonalInfo: hasPersonalInfo
    })
    
    // 如果已登录且已完善个人信息，获取个人信息
    if (isLoggedIn && hasPersonalInfo) {
      const personalInfo = wx.getStorageSync('personalInfo') || {}
      this.setData({
        personalInfo: personalInfo
      })
    }
  },

  // 获取系统信息
  getSystemInfo() {
    try {
      // 使用新的 API 替代已废弃的 wx.getSystemInfoSync()
      const deviceInfo = wx.getDeviceInfo()
      const windowInfo = wx.getWindowInfo()
      const appBaseInfo = wx.getAppBaseInfo()
      
      // 合并所有信息
      const systemInfo = {
        ...deviceInfo,
        ...windowInfo,
        ...appBaseInfo
      }
      
      this.setData({
        systemInfo
      })
      Logger.debug('获取系统信息成功', systemInfo)
    } catch (e) {
      Logger.error('获取系统信息失败', e)
      
      // 如果新 API 不可用，尝试使用旧 API 作为备选
      try {
        const systemInfo = wx.getSystemInfoSync()
        this.setData({
          systemInfo
        })
        Logger.debug('使用旧 API 获取系统信息成功', systemInfo)
      } catch (fallbackError) {
        Logger.error('获取系统信息完全失败', fallbackError)
      }
    }
  },
  
  // 获取应用信息
  getAppInfo() {
    const appInfo = {
      launchTime: getApp().globalData.launchTime || new Date().toLocaleString(),
      memory: '未知'
    }
    
    // 尝试获取内存信息（使用新的性能 API）
    try {
      // 使用新的性能 API
      if (wx.getPerformance) {
        const performance = wx.getPerformance()
        const memoryInfo = performance.getMemoryInfo?.() || performance.getMemoryStats?.()
        
        if (memoryInfo) {
          if (memoryInfo.jsHeapSizeLimit) {
            // 转换为MB并保留2位小数
            const jsHeapSizeUsed = memoryInfo.usedJSHeapSize / (1024 * 1024)
            const jsHeapSizeLimit = memoryInfo.jsHeapSizeLimit / (1024 * 1024)
            appInfo.memory = `${jsHeapSizeUsed.toFixed(2)}MB / ${jsHeapSizeLimit.toFixed(2)}MB`
          } else if (memoryInfo.memory) {
            // 某些设备可能返回不同格式的内存信息
            const memory = memoryInfo.memory / (1024 * 1024)
            appInfo.memory = `${memory.toFixed(2)}MB`
          }
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

  // 用户登录
  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        // 更新本地状态
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
        
        // 调用app的登录方法
        app.login(res.userInfo)
        
        Logger.info('用户登录成功', { nickname: res.userInfo.nickName })
        
        // 如果未完善个人信息，显示个人信息表单
        if (!this.data.hasPersonalInfo) {
          this.showPersonalInfoForm()
        }
      }
    })
  },
  
  // 用户登出
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 调用app的登出方法
          app.logout()
          
          // 更新本地状态
          this.setData({
            userInfo: {},
            hasUserInfo: false,
            hasPersonalInfo: false,
            personalInfo: {}
          })
          
          Logger.info('用户登出成功')
        }
      }
    })
  },
  
  // 显示个人信息表单
  showPersonalInfoForm() {
    // 如果已有个人信息，设置下拉框的初始索引
    if (this.data.hasPersonalInfo) {
      const { age, pregnancyWeek, height, prePregnancyWeight, lastCheckupDate, allergies, checkupRecords, checkupAnalysis } = this.data.personalInfo;
      
      // 设置年龄索引
      const ageIndex = age ? this.data.ageRange.findIndex(item => item == age) : this.data.ageIndex;
      
      // 设置孕周索引
      const pregnancyWeekIndex = pregnancyWeek ? this.data.pregnancyWeekRange.findIndex(item => item == pregnancyWeek) : this.data.pregnancyWeekIndex;
      
      // 设置身高索引
      const heightIndex = height ? this.data.heightRange.findIndex(item => item == height) : this.data.heightIndex;
      
      // 设置体重索引
      const weightIndex = prePregnancyWeight ? this.data.weightRange.findIndex(item => item == prePregnancyWeight) : this.data.weightIndex;
      
      this.setData({
        formData: {
          age: age,
          pregnancyWeek: pregnancyWeek,
          dueDate: this.data.personalInfo.dueDate || '',
          height: height,
          prePregnancyWeight: prePregnancyWeight,
          lastCheckupDate: lastCheckupDate || '',
          allergies: allergies || '',
          dietPreferences: this.data.personalInfo.dietPreferences || '',
          checkupRecords: checkupRecords || [],
          checkupAnalysis: checkupAnalysis || ''
        },
        ageIndex: ageIndex !== -1 ? ageIndex : this.data.ageIndex,
        pregnancyWeekIndex: pregnancyWeekIndex !== -1 ? pregnancyWeekIndex : this.data.pregnancyWeekIndex,
        heightIndex: heightIndex !== -1 ? heightIndex : this.data.heightIndex,
        weightIndex: weightIndex !== -1 ? weightIndex : this.data.weightIndex,
        formTitle: '修改个人信息'
      });
    } else {
      // 首次显示表单，使用默认值
      const formData = {
        age: this.data.ageRange[this.data.ageIndex],
        pregnancyWeek: this.data.pregnancyWeekRange[this.data.pregnancyWeekIndex],
        dueDate: '',
        height: this.data.heightRange[this.data.heightIndex],
        prePregnancyWeight: this.data.weightRange[this.data.weightIndex],
        lastCheckupDate: '',
        allergies: '',
        dietPreferences: '',
        checkupRecords: [],
        checkupAnalysis: ''
      };
      
      this.setData({
        formData: formData,
        formTitle: '完善个人信息'
      });
    }
    
    this.setData({
      showPersonalInfoForm: true
    });
    
    Logger.info('用户' + (this.data.hasPersonalInfo ? '修改' : '完善') + '个人信息');
  },
  
  // 隐藏个人信息表单
  hidePersonalInfoForm() {
    this.setData({
      showPersonalInfoForm: false
    });
  },
  
  // 处理下拉框选择
  onPickerChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    // 根据字段类型设置相应的值
    switch (field) {
      case 'age':
        this.setData({
          'formData.age': this.data.ageRange[value],
          ageIndex: value
        });
        break;
      case 'pregnancyWeek':
        const pregnancyWeek = this.data.pregnancyWeekRange[value];
        this.setData({
          'formData.pregnancyWeek': pregnancyWeek,
          pregnancyWeekIndex: value
        });
        
        // 如果已有预产期，不需要自动计算
        if (!this.data.formData.dueDate) {
          // 根据孕周计算预产期
          const dueDate = this.calculateDueDateFromWeek(pregnancyWeek);
          this.setData({
            'formData.dueDate': dueDate
          });
        }
        break;
      case 'height':
        this.setData({
          'formData.height': this.data.heightRange[value],
          heightIndex: value
        });
        break;
      case 'weight':
        this.setData({
          'formData.prePregnancyWeight': this.data.weightRange[value],
          weightIndex: value
        });
        break;
    }
  },
  
  // 表单输入变化（用于日期选择器）
  onInputChange(e) {
    const { field } = e.currentTarget.dataset;
    const { value } = e.detail;
    
    if (field === 'dueDate') {
      // 设置预产期
      this.setData({
        [`formData.${field}`]: value
      });
      
      // 根据预产期计算孕周
      const pregnancyWeek = this.calculateWeekFromDueDate(value);
      
      // 更新孕周和索引
      const pregnancyWeekIndex = this.data.pregnancyWeekRange.findIndex(item => item == pregnancyWeek);
      if (pregnancyWeekIndex !== -1) {
        this.setData({
          'formData.pregnancyWeek': pregnancyWeek,
          pregnancyWeekIndex: pregnancyWeekIndex
        });
      }
    } else {
      this.setData({
        [`formData.${field}`]: value
      });
    }
  },
  
  // 根据孕周计算预产期
  calculateDueDateFromWeek(pregnancyWeek) {
    // 计算预产期：当前日期 + (40 - 孕周) * 7天
    const today = new Date();
    const daysToAdd = (40 - pregnancyWeek) * 7;
    const dueDate = new Date(today.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    
    // 格式化为YYYY-MM-DD
    const year = dueDate.getFullYear();
    const month = String(dueDate.getMonth() + 1).padStart(2, '0');
    const day = String(dueDate.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  },
  
  // 根据预产期计算孕周
  calculateWeekFromDueDate(dueDateStr) {
    // 解析预产期字符串
    const dueDate = new Date(dueDateStr);
    const today = new Date();
    
    // 计算预产期和今天的差距（毫秒）
    const diffTime = dueDate.getTime() - today.getTime();
    
    // 转换为天数
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // 计算孕周：40周 - 剩余周数
    let pregnancyWeek = Math.floor(40 - diffDays / 7);
    
    // 确保孕周在有效范围内
    pregnancyWeek = Math.max(1, Math.min(45, pregnancyWeek));
    
    return pregnancyWeek;
  },
  
  // 提交个人信息
  submitPersonalInfo() {
    const formData = this.data.formData;
    
    // 必填项验证
    if (!formData.pregnancyWeek || !formData.dueDate) {
      wx.showToast({
        title: '请填写孕周和预产期',
        icon: 'none'
      });
      return;
    }
    
    // 确保孕周和预产期的关系是正确的
    // 根据当前填写的预产期重新计算孕周
    const calculatedWeek = this.calculateWeekFromDueDate(formData.dueDate);
    
    // 如果计算出的孕周与用户选择的不一致，提示用户
    if (calculatedWeek !== formData.pregnancyWeek) {
      wx.showModal({
        title: '提示',
        content: `根据您填写的预产期，当前孕周应为${calculatedWeek}周，是否自动更正？`,
        success: (res) => {
          if (res.confirm) {
            // 用户确认，更新孕周
            formData.pregnancyWeek = calculatedWeek;
            
            // 更新孕周索引
            const pregnancyWeekIndex = this.data.pregnancyWeekRange.findIndex(item => item == calculatedWeek);
            if (pregnancyWeekIndex !== -1) {
              this.setData({
                'formData.pregnancyWeek': calculatedWeek,
                pregnancyWeekIndex: pregnancyWeekIndex
              });
            }
            
            // 保存更新后的信息
            this.savePersonalInfo(formData);
          } else {
            // 用户取消，使用预产期匹配孕周
            const updatedDueDate = this.calculateDueDateFromWeek(formData.pregnancyWeek);
            formData.dueDate = updatedDueDate;
            
            this.setData({
              'formData.dueDate': updatedDueDate
            });
            
            // 保存更新后的信息
            this.savePersonalInfo(formData);
          }
        }
      });
    } else {
      // 孕周和预产期关系正确，直接保存
      this.savePersonalInfo(formData);
    }
  },
  
  // 保存个人信息的实际方法
  savePersonalInfo(formData) {
    // 调用app的更新个人信息方法
    app.updatePersonalInfo(formData);
    
    // 更新本地状态
    this.setData({
      hasPersonalInfo: true,
      personalInfo: formData,
      showPersonalInfoForm: false
    });
    
    wx.showToast({
      title: this.data.formTitle === '修改个人信息' ? '信息已更新' : '信息已保存',
      icon: 'success'
    });
    
    Logger.info('用户' + (this.data.formTitle === '修改个人信息' ? '更新' : '完善') + '个人信息成功');
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
  
  // 导航到聊天页面
  navigateToChat() {
    wx.switchTab({
      url: '/pages/chat/chat'
    })
  },
  
  // 导航到健康档案页面
  navigateToRecords() {
    // 如果未登录或未完善个人信息，提示用户
    if (!this.data.hasUserInfo) {
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.hasPersonalInfo) {
      wx.showToast({
        title: '请先完善个人信息',
        icon: 'none'
      })
      this.showPersonalInfoForm()
      return
    }
    
    // 导航到健康档案页面
    wx.switchTab({
      url: '/pages/records/records'
    })
  },
  
  // 查看开发者工具
  viewDeveloperTools() {
    // 加载日志
    this.loadLogs()
    
    // 获取最新的系统信息和应用信息
    this.getSystemInfo()
    this.getAppInfo()
    
    this.setData({
      showDevPanel: true,
      activeDevTab: 'logs'
    })
    
    Logger.info('用户打开开发者工具')
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
  },
  
  // 上传产检记录照片
  uploadCheckupRecord() {
    // 导航到健康档案页面
    wx.switchTab({
      url: '/pages/records/records'
    });
    
    // 延迟一下再提示用户
    setTimeout(() => {
      wx.showToast({
        title: '请在健康档案页面上传产检记录',
        icon: 'none',
        duration: 2000
      });
    }, 500);
  },
  
  // 预览产检记录照片
  previewImage(e) {
    // 导航到健康档案页面
    wx.switchTab({
      url: '/pages/records/records'
    });
  },
  
  // 删除产检记录照片
  deleteCheckupRecord(e) {
    // 导航到健康档案页面
    wx.switchTab({
      url: '/pages/records/records'
    });
  },
  
  // 初始化日历数据
  initCalendarData() {
    const today = new Date()
    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    
    this.setData({
      'calendarData.year': today.getFullYear(),
      'calendarData.month': today.getMonth() + 1, // 月份从0开始，需要+1
      'calendarData.day': today.getDate(),
      'calendarData.weekday': weekdays[today.getDay()]
    })
    
    Logger.debug('初始化日历数据', this.data.calendarData)
  },
  
  // 更新节气信息
  updateSolarTerm() {
    Logger.debug('开始更新节气信息');
    
    // 获取节气信息
    const solarTermInfo = solarTermService.getSolarTermInfo();
    Logger.debug('获取到节气信息', solarTermInfo);
    this.setData({ solarTermInfo }, () => {
      Logger.debug('节气信息已更新到界面');
    });
  },

  // 显示关于我们
  showAbout() {
    wx.navigateTo({
      url: '/pages/settings/settings?tab=about'
    })
    Logger.debug('用户点击关于我们')
  },
}) 