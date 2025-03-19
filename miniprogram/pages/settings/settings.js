const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'

const { STORAGE_KEYS, MODEL_CONFIG, MODEL_OPTIONS, DEFAULT_AI_CONFIG } = appConfig

Page({
  data: {
    cacheSize: '0KB',
    showAboutInfo: false,
    isLoggedIn: false,
    modelOptions: MODEL_OPTIONS,
    currentModelName: DEFAULT_AI_CONFIG.MODEL,
    showModelOptions: false,
  },

  // =============================================
  // 页面生命周期函数
  // =============================================

  onLoad(options) {
    Logger.info('设置页面加载')
    this.calculateCacheSize()
    this.loadModelSettings()
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
    })

    // 如果有传入 tab 参数，自动滚动到对应的部分
    if (options && options.tab) {
      if (options.tab === 'about') {
        // 延迟一下，确保页面已经渲染完成
        setTimeout(() => {
          this.scrollToAbout()
          // 自动展开关于信息
          this.setData({
            showAboutInfo: true,
          })
        }, 300)
      }
    }
  },

  onShow() {
    // 每次显示页面时重新加载模型设置
    this.loadModelSettings()
  },

  // =============================================
  // 用户相关函数
  // =============================================

  // 退出登录
  async logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async res => {
        if (res.confirm) {
          // 更新页面状态
          this.setData({
            isLoggedIn: false,
          })

          // 更新全局状态
          app.globalData.isLoggedIn = false

          // 清除所有本地缓存
          wx.clearStorageSync()
          Logger.info('用户登出成功')
        }
      },
    })
  },

  // =============================================
  // 缓存管理函数
  // =============================================

  // 计算缓存大小
  calculateCacheSize() {
    wx.getStorageInfo({
      success: res => {
        let size = res.currentSize
        let sizeStr = ''

        if (size < 1024) {
          sizeStr = size + 'KB'
        } else {
          sizeStr = (size / 1024).toFixed(2) + 'MB'
        }

        this.setData({
          cacheSize: sizeStr,
        })

        Logger.debug('获取缓存大小成功', { size: sizeStr })
      },
      fail: err => {
        Logger.error('获取缓存大小失败', err)
      },
    })
  },

  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？。',
      success: res => {
        if (res.confirm) {
          // 缓存聊天记录设置为空
          wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY, [])
          wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER, 0)
          // 缓存笔记设置为空
          wx.setStorageSync(STORAGE_KEYS.NOTES, [])
          wx.setStorageSync(STORAGE_KEYS.NOTES_CHANGED, false)
        }
      },
    })
  },

  // =============================================
  // 导航和界面相关函数
  // =============================================

  // 滚动到"关于"部分
  scrollToAbout() {
    wx.createSelectorQuery()
      .select('.settings-section')
      .boundingClientRect(rect => {
        if (rect) {
          wx.pageScrollTo({
            scrollTop: rect.top,
            duration: 300,
          })
        }
      })
      .exec()
  },

  // 切换显示/隐藏关于信息
  toggleAboutInfo() {
    this.setData({
      showAboutInfo: !this.data.showAboutInfo,
    })
    Logger.debug('用户切换关于信息显示状态', { showAboutInfo: this.data.showAboutInfo })
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/policy/privacy',
    })
    Logger.info('用户查看隐私政策')
  },

  // =============================================
  // 模型设置相关函数
  // =============================================

  // 切换模型选项滑出层显示状态
  toggleModelOptions() {
    this.setData({
      showModelOptions: true,
    })
    Logger.info('用户打开模型选项滑出层')
  },

  // 关闭模型选项滑出层
  closeModelOptions() {
    this.setData({
      showModelOptions: false,
    })
    Logger.info('用户关闭模型选项滑出层')
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 仅用于阻止事件冒泡
    return
  },

  // 加载模型设置
  loadModelSettings() {
    try {
      // 从本地存储获取当前模型
      const lastUsedModel = wx.getStorageSync('lastUsedModel')
      if (lastUsedModel && MODEL_CONFIG[lastUsedModel]) {
        const modelConfig = MODEL_CONFIG[lastUsedModel]
        this.setData({
          currentModelName: modelConfig.name,
        })
        Logger.info(`已加载模型设置: ${lastUsedModel} (${modelConfig.name})`)
      }
    } catch (error) {
      Logger.error('加载模型设置失败', error)
    }
  },

  // 选择模型
  selectModel(e) {
    const modelApi = e.currentTarget.dataset.model

    // 查找对应的模型配置
    let selectedModel = null
    for (const key in MODEL_CONFIG) {
      if (MODEL_CONFIG[key].api === modelApi) {
        selectedModel = key
        break
      }
    }

    if (selectedModel && MODEL_CONFIG[selectedModel]) {
      const modelConfig = MODEL_CONFIG[selectedModel]
      this.setData({
        currentModelName: modelConfig.name,
        showModelOptions: false, // 选择后关闭滑出层
      })

      // 保存用户选择的模型到本地存储
      try {
        wx.setStorageSync('lastUsedModel', selectedModel)

        // 显示切换成功的提示
        wx.showToast({
          title: `已切换至 ${modelConfig.name}`,
          icon: 'success',
          duration: 1500,
        })

        // 记录模型切换日志
        Logger.info(`模型已切换至 ${modelConfig.name} (${modelConfig.api})`)
      } catch (error) {
        Logger.error('保存模型选择时出错:', error)
        wx.showToast({
          title: '设置失败',
          icon: 'error',
          duration: 1500,
        })
      }
    } else {
      // 显示错误提示
      wx.showToast({
        title: '无效的模型类型',
        icon: 'error',
        duration: 1500,
      })
      Logger.error(`尝试切换至无效的模型类型: ${modelApi}`)
    }
  },
})
