const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'
import solarTermService from '../../services/solarTermService'

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig;

Page({
  data: {
    userInfo: {},
    loginStatus: false,
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
        id: 4,
        name: '设置',
        icon: '/images/settings.png',
        url: '/pages/settings/settings'
      }
    ],

    // 日历数据
    calendarData: {
      year: '',
      month: '',
      day: '',
      weekday: ''
    },

    // 节气信息
    solarTermInfo: '',
  },

  onLoad() {
    Logger.info('个人页面加载')

    // 加载用户信息
    this.setData({
      userInfo: wx.getStorageSync(STORAGE_KEYS.USER_INFO),
      loginStatus: app.globalData.loginStatus
    })

    // 初始化日历数据
    this.initCalendarData()

    // 获取节气信息
    this.updateSolarTerm()
  },

  onShow() {
    Logger.info('个人页面显示');

    // 初始化日历数据
    this.initCalendarData();

    // 获取节气信息
    this.updateSolarTerm();
  },

  // 用户登录
  login() {
    // 检查权限
    wx.getSetting({
      success: (res) => {
        if (!res.authSetting['scope.userInfo']) {
          wx.authorize({
            scope: 'scope.userInfo',
            success: () => this.login(), // 授权成功后再次调用登录
            fail: (err) => {
              Logger.error('授权失败', err);
              wx.showToast({
                title: '授权失败，请重试',
                icon: 'none'
              })
            }
          })
          return;
        }
      }
    });

    // 获取用户信息
    wx.getUserInfo({
      desc: '你的信息将用于小程序登录',
      success: (res) => {
        const userInfo = {
          nickName: res.userInfo.nickName,
          avatarUrl: res.userInfo.avatarUrl
        }
        // 调用登录API
        wx.login({
          success: (loginRes) => {
            wx.showLoading({ title: '登录中...' });
            // 调用云函数
            wx.cloud.callFunction({
              name: CLOUD_FUNCTIONS.LOGIN,
              data: {
                code: loginRes.code,
                userInfo: userInfo
              }
            }).then(async (res) => {
              wx.hideLoading();

              // 验证返回数据格式
              if (!res || !res.result) {
                reject(new Error('无效登录响应'));
                return;
              }

              const { success, userInfo, error } = res.result;

              if (success) {
                // 更新本地状态
                this.setData({
                  userInfo: userInfo,
                  loginStatus: true
                });

                wx.setStorageSync('userInfo', userInfo)
                wx.setStorageSync('loginStatus', true)

                app.globalData.loginStatus = true
                Logger.info('登录成功');
              } else {
                Logger.error('登录失败', error);
                wx.showToast({
                  title: '登录失败，请重试',
                  icon: 'none'
                });
              }
            })
          }
        })
      }
    });
  },

  // 用户登出
  logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: res => {
        if (res.confirm) {
          // 清除本地存储中的用户信息和登录状态
          wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
          wx.removeStorageSync(STORAGE_KEYS.LOGIN_STATUS);
          wx.removeStorageSync(STORAGE_KEYS.HEALTH_RECORDS);
          wx.removeStorageSync(STORAGE_KEYS.HAS_HEALTH_RECORDS);

          // 更新本地状态
          this.setData({
            userInfo: {},
            loginStatus: false
          });

          Logger.info('用户登出成功');
        }
      }
    });
  },

  editNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: this.data.userInfo.nickName,
      success: async (res) => {
        if (res.confirm) {
          const newNickname = res.content

          // 调用云函数
          wx.cloud.callFunction({
            name: CLOUD_FUNCTIONS.UPDATE_USER_INFO,
            data: {
              property: 'nickName',
              value: newNickname
            }
          }).then(res => {
            if (!res || !res.result) {
              reject(new Error('无效更新响应'));
              return;
            }

            const { success, error } = res.result;

            if (success) {
              this.setData({
                userInfo: {
                  nickName: newNickname,
                  avatarUrl: this.data.userInfo.avatarUrl
                }
              });

              wx.setStorageSync('userInfo', this.data.userInfo)
              Logger.info('昵称修改成功');
            } else {
              Logger.error('更新失败', error);
              wx.showToast({
                title: '修改失败，请重试',
                icon: 'none'
              });
            }
          }).catch(err => {
            Logger.error('更新失败', err);
            wx.showToast({
              title: '修改失败，请重试',
              icon: 'none'
            });
          })
        }
      }
    })
  },

  // 初始化日历数据
  initCalendarData() {
    Logger.debug('开始初始化日历数据');

    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    // 获取星期几
    const weekDay = '日一二三四五六'.charAt(date.getDay());

    this.setData({
      calendarData: {
        year,
        month,
        day,
        weekday: weekDay
      }
    });

    Logger.debug('日历数据已初始化', this.data.calendarData);
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

  // 导航到设置页面
  navigateToSettings() {
    wx.navigateTo({
      url: '/pages/settings/settings'
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
}) 