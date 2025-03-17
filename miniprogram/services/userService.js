/**
 * 用户服务
 * 负责处理用户登录、注册、个人信息和健康记录
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig

const app = getApp()

/**
 * 用户登录
 * @returns {Promise<Object>} 登录结果
 */
async function login(healthRecords) {
  try {
    // 1. 检查权限（异步处理）
    const authSetting = await new Promise((resolve, reject) => {
      wx.getSetting({
        success: resolve,
        fail: reject,
      })
    })

    if (!authSetting.authSetting['scope.userInfo']) {
      Logger.debug('未授权')
      // 2. 授权弹窗（避免递归调用）
      return new Promise((resolve, reject) => {
        wx.authorize({
          scope: 'scope.userInfo',
          success: resolve,
          fail: reject,
        })
      })
    }

    // 3. 获取用户信息（异步处理）
    const userInfoRes = await new Promise((resolve, reject) => {
      wx.getUserInfo({
        desc: '你的信息将用于小程序登录',
        success: resolve,
        fail: reject,
      })
    })

    const userInfo = {
      nickName: userInfoRes.userInfo.nickName,
      avatarUrl: userInfoRes.userInfo.avatarUrl,
    }

    // 4. 调用云函数（添加错误处理）
    const cloudRes = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.LOGIN,
      data: { userInfo, healthRecords },
    })

    console.log('cloudRes', cloudRes)

    if (cloudRes.result.success) {
      return cloudRes.result.data
    } else {
      throw new Error('云函数登录失败:' + cloudRes.result.error || '登录失败')
    }
  } catch (error) {
    Logger.error('userService: 登录失败:', error)
    throw error
  }
}

/**
 * 更新用户个人信息
 * @param {Object} 指定属性的名称和值
 * @returns {Promise<Object>} 更新结果
 */
function updateUserInfo(property, value) {
  return new Promise((resolve, reject) => {
    wx.cloud
      .callFunction({
        name: CLOUD_FUNCTIONS.UPDATE_USER_INFO,
        data: { property, value },
      })
      .then(async res => {
        if (!res || !res.result) {
          reject(new Error('无效更新响应'))
          return
        }

        const { success, error } = res.result

        if (success) {
          resolve(res.result)
        } else {
          Logger.error('userService: 更新失败:', error)
          reject(new Error(error || '更新失败'))
        }
      })
      .catch(err => {
        Logger.error('userService: 异常:', err)
        reject(err)
      })
  })
}

export default {
  login,
  updateUserInfo,
}
