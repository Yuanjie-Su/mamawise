const app = getApp()
import Logger from '../../utils/logger'

Page({
  data: {
    cacheSize: '0KB',
    showAboutInfo: false
  },

  onLoad(options) {
    Logger.info('设置页面加载')
    this.calculateCacheSize()
    
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
          const userInfo = wx.getStorageSync('userInfo')
          const personalInfo = wx.getStorageSync('personalInfo')
          
          // 清除所有缓存
          wx.clearStorage({
            success: () => {
              // 恢复重要数据
              if (userInfo) wx.setStorageSync('userInfo', userInfo)
              if (personalInfo) wx.setStorageSync('personalInfo', personalInfo)
              
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
  
  // 查看隐私政策
  viewPrivacyPolicy() {
    wx.navigateTo({
      url: '/pages/policy/privacy'
    })
  },
  
  // 查看用户协议
  viewUserAgreement() {
    wx.navigateTo({
      url: '/pages/policy/agreement'
    })
  },
  
  // 打开位置信息授权设置
  openLocationSettings() {
    wx.showModal({
      title: '位置信息授权',
      content: '我们需要获取您的位置信息，仅用于为您提供所在地区的实时天气服务，帮助您更好地规划日常活动。您的位置数据将被严格保密，不会用于其他用途。',
      confirmText: '去授权',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          wx.openSetting({
            success: (settingRes) => {
              if (settingRes.authSetting['scope.userLocation']) {
                wx.showToast({
                  title: '授权成功',
                  icon: 'success'
                });
                Logger.info('用户成功授权位置信息');
              } else {
                Logger.info('用户未授权位置信息');
              }
            },
            fail: (err) => {
              Logger.error('打开设置页面失败', err);
            }
          });
        }
      }
    });
  }
}) 