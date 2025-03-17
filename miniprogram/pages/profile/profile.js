const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'
import solarTermService from '../../services/solarTermService'
import userService from '../../services/userService'
const { STORAGE_KEYS, CLOUD_FUNCTIONS, DEFAULT_HEALTH_RECORDS } = appConfig

Page({
  data: {
    userInfo: {},
    isLoggedIn: false,
    menuList: [
      {
        id: 1,
        name: '我的收藏',
        icon: '/images/icons/favorited.png',
        url: '/pages/favorites/favorites',
      },
      {
        id: 2,
        name: '使用帮助',
        icon: '/images/icons/help.png',
        url: '',
      },
      {
        id: 4,
        name: '设置',
        icon: '/images/icons/settings.png',
        url: '/pages/settings/settings',
      },
    ],

    // 日历数据
    calendarData: {
      year: '',
      month: '',
      day: '',
      weekday: '',
    },

    // 节气信息
    solarTermInfo: '',
  },

  // =============================================
  // 页面生命周期函数
  // =============================================

  onLoad() {
    Logger.info('个人页面加载')

    // 加载用户信息
    this.setData({
      userInfo: wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {},
      isLoggedIn: app.globalData.isLoggedIn,
    })
  },

  onShow() {
    Logger.info('个人页面显示')

    // 检查登录是否发生变化
    let currentIsLoggedIn = app.globalData.isLoggedIn
    if (currentIsLoggedIn !== this.data.isLoggedIn) {
      this.setData({
        isLoggedIn: currentIsLoggedIn,
      })
      if (currentIsLoggedIn) {
        this.setData({
          userInfo: wx.getStorageSync(STORAGE_KEYS.USER_INFO) || {},
        })
      } else {
        this.setData({
          userInfo: {},
        })
      }
    }

    // 初始化日历数据
    this.initCalendarData()

    // 获取节气信息
    this.updateSolarTerm()
  },

  // =============================================
  // 用户信息相关函数
  // =============================================

  // 用户登录
  async login() {
    wx.showLoading({
      title: '登录中...',
    })

    try {
      const data = await userService.login(DEFAULT_HEALTH_RECORDS)

      this.setData({
        userInfo: data.userInfo,
        isLoggedIn: true,
      })

      // 更新全局状态
      app.globalData.isLoggedIn = true
      app.globalData.prompt_healthRecords = data.healthRecordsPrompt || ''

      await Promise.all([
        // 更新用户信息
        wx.setStorage({
          key: STORAGE_KEYS.USER_INFO,
          data: data.userInfo,
        }),

        // 更新登录状态
        wx.setStorage({
          key: STORAGE_KEYS.IS_LOGGED_IN,
          data: true,
        }),

        // 更新聊天记录
        wx.setStorage({
          key: STORAGE_KEYS.CHAT_HISTORY,
          data: data.chatHistory || pas,
        }),

        // 更新提示词
        wx.setStorage({
          key: STORAGE_KEYS.PROMPT_HEALTH_RECORDS,
          data: data.healthRecordsPrompt || '',
        }),

        wx.setStorage({
          key: STORAGE_KEYS.HEALTH_RECORDS,
          data: data.healthRecords || DEFAULT_HEALTH_RECORDS,
        }),

        // 更新收藏夹
        wx.setStorage({
          key: STORAGE_KEYS.FAVORITES,
          data: data.favorites || [],
        }),
      ])

      wx.hideLoading()
    } catch (err) {
      // 提示用户登录失败
      wx.showToast({
        title: '登录失败，请重试\n' + err.message,
        icon: 'none',
        duration: 2000,
      })

      Logger.error('登录失败', err)
    }
  },

  // 编辑用户信息
  editUserInfo() {
    if (!this.data.isLoggedIn) {
      return
    }

    wx.showActionSheet({
      itemList: ['修改头像', '修改昵称'],
      success: res => {
        if (res.tapIndex === 0) {
          // 修改头像
          this.changeAvatar()
        } else if (res.tapIndex === 1) {
          // 修改昵称
          this.changeNickname()
        }
      },
    })
  },

  // 修改头像
  changeAvatar() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFilePaths[0]

        // 显示加载提示
        wx.showLoading({
          title: '上传中...',
        })

        // 压缩图片，设置宽度为200，保持原比例
        wx.compressImage({
          src: tempFilePath,
          quality: 80, // 压缩质量，80%已经是很好的压缩比例
          compressedWidth: 200, // 宽度设置为200px，适合头像显示
          success: compressRes => {
            const compressedPath = compressRes.tempFilePath

            // 上传压缩后的图片到云存储
            const cloudPath = `mamawise/miniprogram/images/user_avatar/${
              app.globalData.openid || 'user'
            }_${new Date().getTime()}.png`

            wx.cloud.uploadFile({
              cloudPath: cloudPath,
              filePath: compressedPath,
              success: res => {
                const fileID = res.fileID

                // 调用云函数更新用户头像
                wx.cloud
                  .callFunction({
                    name: CLOUD_FUNCTIONS.UPDATE_USER_INFO,
                    data: {
                      property: 'avatarUrl',
                      value: fileID,
                    },
                  })
                  .then(res => {
                    wx.hideLoading()

                    if (!res || !res.result) {
                      wx.showToast({
                        title: '更新失败，请重试',
                        icon: 'none',
                      })
                      return
                    }

                    const { success, error } = res.result

                    if (success) {
                      // 更新本地状态
                      const updatedUserInfo = {
                        ...this.data.userInfo,
                        avatarUrl: fileID,
                      }

                      this.setData({
                        userInfo: updatedUserInfo,
                      })

                      // 更新本地存储
                      wx.setStorageSync(STORAGE_KEYS.USER_INFO, updatedUserInfo)

                      wx.showToast({
                        title: '头像已更新',
                        icon: 'success',
                      })

                      Logger.info('用户头像已更新', { fileID })
                    } else {
                      Logger.error('更新头像失败', error)
                      wx.showToast({
                        title: '更新失败，请重试',
                        icon: 'none',
                      })
                    }
                  })
                  .catch(err => {
                    wx.hideLoading()
                    Logger.error('更新头像失败', err)
                    wx.showToast({
                      title: '更新失败，请重试',
                      icon: 'none',
                    })
                  })
              },
              fail: err => {
                wx.hideLoading()
                Logger.error('上传头像失败', err)
                wx.showToast({
                  title: '上传失败，请重试',
                  icon: 'none',
                })
              },
            })
          },
          fail: err => {
            wx.hideLoading()
            Logger.error('压缩头像失败', err)
            wx.showToast({
              title: '图片处理失败，请重试',
              icon: 'none',
            })
          },
        })
      },
    })
  },

  // 修改昵称
  changeNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: this.data.userInfo.nickName,
      success: async res => {
        if (res.confirm && res.content.trim()) {
          const newNickname = res.content.trim()

          try {
            wx.showLoading({ title: '保存中...' })

            // 调用云函数更新用户信息
            const result = await wx.cloud.callFunction({
              name: CLOUD_FUNCTIONS.UPDATE_USER_INFO,
              data: {
                property: 'nickName',
                value: newNickname,
              },
            })

            wx.hideLoading()

            if (!result || !result.result) {
              throw new Error('无效更新响应')
            }

            const { success, error } = result.result

            if (success) {
              // 更新本地状态
              const updatedUserInfo = {
                ...this.data.userInfo,
                nickName: newNickname,
              }

              this.setData({
                userInfo: updatedUserInfo,
              })

              // 更新本地存储
              wx.setStorageSync(STORAGE_KEYS.USER_INFO, updatedUserInfo)

              wx.showToast({
                title: '昵称已更新',
                icon: 'success',
              })

              Logger.info('用户昵称已更新', { newNickname })
            } else {
              throw new Error(error || '更新失败')
            }
          } catch (error) {
            wx.hideLoading()
            wx.showToast({
              title: '更新失败，请重试',
              icon: 'none',
            })
            Logger.error('更新用户昵称失败', error)
          }
        }
      },
    })
  },

  // =============================================
  // 日历和节气相关函数
  // =============================================

  // 初始化日历数据
  initCalendarData() {
    Logger.debug('开始初始化日历数据')

    const date = new Date()
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()

    // 获取星期几
    const weekDay = '日一二三四五六'.charAt(date.getDay())

    this.setData({
      calendarData: {
        year,
        month,
        day,
        weekday: weekDay,
      },
    })

    Logger.debug('日历数据已初始化', this.data.calendarData)
  },

  // 更新节气信息
  updateSolarTerm() {
    Logger.debug('开始更新节气信息')

    // 获取节气信息
    const solarTermInfo = solarTermService.getSolarTermInfo()
    Logger.debug('获取到节气信息', solarTermInfo)
    this.setData({ solarTermInfo }, () => {
      Logger.debug('节气信息已更新到界面')
    })
  },

  // =============================================
  // 导航相关函数
  // =============================================

  // 显示关于我们
  showAbout() {
    wx.navigateTo({
      url: '/pages/settings/settings?tab=about',
    })
    Logger.debug('用户点击关于我们')
  },

  // 导航到设置页面
  navigateToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings',
    })
  },

  // 导航到菜单项
  navigateTo(e) {
    const item = e.currentTarget.dataset.item

    // 如果有特定操作，执行对应函数
    if (item.action && this[item.action]) {
      this[item.action]()
      return
    }

    // 检查"我的收藏"是否需要登录
    if (item.name === '我的收藏' && !this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录，才能查看收藏内容',
        confirmText: '去登录',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            this.login()
          }
        },
      })
      return
    }

    // 否则执行普通导航
    const url = item.url
    if (url) {
      wx.navigateTo({
        url: url,
      })
      Logger.debug('用户导航到', { url })
    } else {
      wx.showToast({
        title: '功能开发中',
        icon: 'none',
      })
      Logger.debug('用户尝试访问开发中的功能')
    }
  },
})
