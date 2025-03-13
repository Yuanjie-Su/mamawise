const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'

const { STORAGE_KEYS } = appConfig;

Page({
  data: {
    cacheSize: '0KB',
    showAboutInfo: false,
    isLoggedIn: false
  },

  // =============================================
  // 页面生命周期函数
  // =============================================
  
  onLoad(options) {
    Logger.info('设置页面加载')
    this.calculateCacheSize()
    this.setData({
      isLoggedIn: app.globalData.isLoggedIn
    })
    
    // 如果有传入 tab 参数，自动滚动到对应的部分
    if (options && options.tab) {
      if (options.tab === 'about') {
        // 延迟一下，确保页面已经渲染完成
        setTimeout(() => {
          this.scrollToAbout()
          // 自动展开关于信息
          this.setData({
            showAboutInfo: true
          })
        }, 300)
      }
    }
  },
  
  // =============================================
  // 用户相关函数
  // =============================================
  
  // 退出登录
  async logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          // 更新页面状态
          this.setData({
            isLoggedIn: false
          });

          // 更新全局状态
          app.globalData.isLoggedIn = false

          // 清除本地存储中的用户信息和登录状态
          wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
          wx.removeStorageSync(STORAGE_KEYS.IS_LOGGED_IN);
          wx.removeStorageSync(STORAGE_KEYS.HEALTH_RECORDS);
          wx.removeStorageSync(STORAGE_KEYS.HAS_HEALTH_RECORDS);

          Logger.info('用户登出成功');
        }
      }
    })
  },
  
  // =============================================
  // 缓存管理函数
  // =============================================
  
  // 计算缓存大小
  calculateCacheSize() {
    wx.getStorageInfo({
      success: (res) => {
        let size = res.currentSize
        let sizeStr = ''
        
        if (size < 1024) {
          sizeStr = size + 'KB'
        } else {
          sizeStr = (size / 1024).toFixed(2) + 'MB'
        }
        
        this.setData({
          cacheSize: sizeStr
        })
        
        Logger.debug('获取缓存大小成功', { size: sizeStr })
      },
      fail: (err) => {
        Logger.error('获取缓存大小失败', err)
      }
    })
  },
  
  // 清除缓存
  clearCache() {
    wx.showModal({
      title: '提示',
      content: '确定要清除缓存吗？这将清除所有本地存储的数据（不包括登录信息和个人信息）。',
      success: (res) => {
        if (res.confirm) {
          // 保存重要数据
          const userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO)
          
          // 清除所有缓存
          wx.clearStorage({
            success: () => {
              // 恢复重要数据
              if (userInfo) wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo)
              
              // 重新计算缓存大小
              this.calculateCacheSize()
              
              wx.showToast({
                title: '缓存已清除',
                icon: 'success'
              })
              
              Logger.info('用户清除缓存成功')
            },
            fail: (err) => {
              Logger.error('清除缓存失败', err)
              wx.showToast({
                title: '清除缓存失败',
                icon: 'none'
              })
            }
          })
        }
      }
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
            duration: 300
          })
        }
      })
      .exec()
  },
  
  // 切换显示/隐藏关于信息
  toggleAboutInfo() {
    this.setData({
      showAboutInfo: !this.data.showAboutInfo
    })
    Logger.debug('用户切换关于信息显示状态', { showAboutInfo: this.data.showAboutInfo })
  },
  
  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/policy/privacy'
    })
  },
  
  // 查看用户协议
  viewUserAgreement() {
    // 这里可以跳转到用户协议页面或者显示用户协议内容
    Logger.info('用户查看用户协议');
  },
}) 