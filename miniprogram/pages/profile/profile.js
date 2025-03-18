const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'
import solarTermService from '../../services/solarTermService'
import userService from '../../services/userService'
import fileUtil from '../../utils/fileUtil'
import storageUtil from '../../utils/storageUtil'
import uiUtil from '../../utils/uiUtil'

const { STORAGE_KEYS, DEFAULT_HEALTH_RECORDS } = appConfig

Page({
  data: {
    userInfo: {},
    isLoggedIn: false,
    menuList: [
      {
        id: 1,
        name: '我的笔记',
        icon: '/images/icons/my_notes.png',
        url: '/pages/notes/notes',
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

  async onLoad() {
    Logger.info('个人页面加载')

    // 加载用户信息
    const userInfo = await storageUtil.getStorage(STORAGE_KEYS.USER_INFO, {})
    this.setData({
      userInfo,
      isLoggedIn: app.globalData.isLoggedIn,
    })
  },

  async onShow() {
    Logger.info('个人页面显示')

    // 检查登录是否发生变化
    let currentIsLoggedIn = app.globalData.isLoggedIn
    if (currentIsLoggedIn !== this.data.isLoggedIn) {
      this.setData({
        isLoggedIn: currentIsLoggedIn,
      })

      if (currentIsLoggedIn) {
        const userInfo = await storageUtil.getStorage(STORAGE_KEYS.USER_INFO, {})
        this.setData({ userInfo })
      } else {
        this.setData({ userInfo: {} })
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
    try {
      uiUtil.showLoading('登录中...')

      const data = await userService.login(DEFAULT_HEALTH_RECORDS)

      this.setData({
        userInfo: data.userInfo,
        isLoggedIn: true,
      })

      // 更新全局状态
      app.globalData.isLoggedIn = true
      app.globalData.prompt_healthRecords = data.healthRecordsPrompt || ''

      // 批量保存数据到本地存储
      await storageUtil.batchSetStorage([
        { key: STORAGE_KEYS.USER_INFO, data: data.userInfo },
        { key: STORAGE_KEYS.IS_LOGGED_IN, data: true },
        { key: STORAGE_KEYS.CHAT_HISTORY, data: data.chatHistory || [] },
        { key: STORAGE_KEYS.HEALTH_RECORDS_PROMPT, data: data.healthRecordsPrompt || '' },
        { key: STORAGE_KEYS.HEALTH_RECORDS, data: data.healthRecords || DEFAULT_HEALTH_RECORDS },
        { key: STORAGE_KEYS.NOTES, data: data.notes || [] },
      ])

      uiUtil.hideLoading()
    } catch (err) {
      uiUtil.hideLoading()
      await uiUtil.showToast('登录错误\n' + err.message, 'none', 2000)
      Logger.error('登录失败', err)
    }
  },

  // 编辑用户信息
  async editUserInfo() {
    if (!this.data.isLoggedIn) {
      return
    }

    try {
      const result = await uiUtil.showActionSheet(['修改头像', '修改昵称'])

      // 用户取消了操作
      if (result.tapIndex === -1 || result.canceled) {
        Logger.info('用户取消了编辑操作')
        return
      }

      if (result.tapIndex === 0) {
        // 修改头像
        await this.changeAvatar()
      } else if (result.tapIndex === 1) {
        // 修改昵称
        await this.changeNickname()
      }
    } catch (error) {
      // 忽略由用户取消操作导致的错误
      if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
        Logger.info('用户取消了操作')
        return
      }

      Logger.error('编辑用户信息失败', error)
    }
  },

  // 修改头像
  async changeAvatar() {
    try {
      // 选择图片
      const res = await wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
      })

      const tempFilePath = res.tempFilePaths[0]

      // 显示加载提示
      uiUtil.showLoading('上传中...')

      // 处理并上传头像
      const fileID = await fileUtil.processAndUploadAvatar(tempFilePath, app.globalData.openid)

      // 使用userService更新用户头像
      await userService.updateUserInfo('avatarUrl', fileID)

      // 更新本地状态
      const updatedUserInfo = {
        ...this.data.userInfo,
        avatarUrl: fileID,
      }

      this.setData({ userInfo: updatedUserInfo })

      // 更新本地存储
      await storageUtil.setStorage(STORAGE_KEYS.USER_INFO, updatedUserInfo)

      uiUtil.hideLoading()
      Logger.info('用户头像已更新', { fileID })
    } catch (err) {
      uiUtil.hideLoading()

      // 用户取消选择图片，不显示错误提示
      if (err && err.errMsg && err.errMsg.indexOf('cancel') !== -1) {
        Logger.info('用户取消选择图片')
        return
      }

      await uiUtil.showToast('更新失败，请重试', 'none')
      Logger.error('更新头像失败', err)
    }
  },

  // 修改昵称
  async changeNickname() {
    try {
      const modalResult = await uiUtil.showModal({
        title: '修改昵称',
        editable: true,
        placeholderText: this.data.userInfo.nickName,
      })

      if (modalResult.confirm && modalResult.content.trim()) {
        const newNickname = modalResult.content.trim()

        uiUtil.showLoading('保存中...')

        const userServiceResult = await userService.updateUserInfo('nickName', newNickname)

        uiUtil.hideLoading()

        Logger.info('用户昵称更新结果', userServiceResult)

        if (!userServiceResult || !userServiceResult.success) {
          throw new Error('无效更新响应')
        }

        // 更新本地状态
        const updatedUserInfo = {
          ...this.data.userInfo,
          nickName: newNickname,
        }

        this.setData({ userInfo: updatedUserInfo })

        // 更新本地存储
        await storageUtil.setStorage(STORAGE_KEYS.USER_INFO, updatedUserInfo)

        Logger.info('用户昵称已更新', { newNickname })
      }
    } catch (error) {
      uiUtil.hideLoading()
      await uiUtil.showToast('更新失败，请重试', 'none')
      Logger.error('更新用户昵称失败', error)
    }
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
  async navigateTo(e) {
    const item = e.currentTarget.dataset.item

    // 如果有特定操作，执行对应函数
    if (item.action && this[item.action]) {
      this[item.action]()
      return
    }

    // 检查"我的笔记"是否需要登录
    if (item.name === '我的笔记' && !this.data.isLoggedIn) {
      const modalResult = await uiUtil.showModal({
        title: '提示',
        content: '请先登录，才能查看笔记内容',
        confirmText: '去登录',
        cancelText: '取消',
      })

      if (modalResult.confirm) {
        await this.login()
      }
      return
    }

    // 否则执行普通导航
    const url = item.url
    if (url) {
      wx.navigateTo({ url })
      Logger.debug('用户导航到', { url })
    } else {
      await uiUtil.showToast('功能开发中')
      Logger.debug('用户尝试访问开发中的功能')
    }
  },
})
