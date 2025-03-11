const app = getApp()
import Logger from '../../utils/logger'
import solarTermService from '../../services/solarTermService'
import userService from '../../services/userService'

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
      userInfo: app.globalData.userInfo,
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
            // 调用登录服务
            userService.login(loginRes.code, userInfo)
              .then(res => {
                if (res.success) {
                  Logger.info('登录成功');
                  app.globalData.userInfo = userInfo
                  app.globalData.loginStatus = true
                  this.setData({
                    userInfo: userInfo,
                    loginStatus: true
                  });
                } else {
                  Logger.error('登录失败', res.error);
                  wx.showToast({
                    title: '登录失败，请重试',
                    icon: 'none'
                  });
                }
              })
              .catch(err => {
                Logger.error('登录失败', err);
                wx.showToast({
                  title: '登录失败，请重试',
                  icon: 'none'
                });
              })
          }
        })
      }
    });
  },

  // 用户登出
  async logout() {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: async (res) => {
        if (res.confirm) {
          try {
            // 调用服务登出方法
            await userService.logout();

            // 更新本地状态
            this.setData({
              userInfo: {},
              loginStatus: false
            });

            Logger.info('用户登出成功');
          } catch (error) {
            Logger.error('用户登出失败', error);
            wx.showToast({
              title: '登出失败，请重试',
              icon: 'none'
            });
          }
        }
      }
    });
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