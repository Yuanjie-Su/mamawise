/**
 * 用户服务
 * 负责处理用户登录、注册、个人信息和健康记录
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig

const app = getApp()

/**
 * 获取用户设置
 * @returns {Promise<Object>} 用户设置
 */
async function getUserSetting() {
  try {
    return await wx.getSetting()
  } catch (error) {
    Logger.error('获取用户设置失败', error)
    throw error
  }
}

/**
 * 申请用户授权
 * @param {string} scope - 授权范围
 * @returns {Promise<Object>} 授权结果
 */
async function authorize(scope) {
  try {
    return await wx.authorize({ scope })
  } catch (error) {
    Logger.error('用户授权失败', error)
    throw error
  }
}

/**
 * 获取用户信息
 * @returns {Promise<Object>} 用户信息
 */
async function getUserInfo() {
  try {
    return await wx.getUserInfo({
      desc: '你的信息将用于小程序登录',
    })
  } catch (error) {
    Logger.error('获取用户信息失败', error)
    throw error
  }
}

/**
 * 用户登录
 * @returns {Promise<Object>} 登录结果
 */
async function login(healthRecords) {
  try {
    // 1. 检查权限
    const authSetting = await getUserSetting()

    if (!authSetting.authSetting['scope.userInfo']) {
      Logger.debug('未授权')
      // 2. 授权弹窗
      await authorize('scope.userInfo')
    }

    // 3. 获取用户信息
    const userInfoRes = await getUserInfo()

    const userInfo = {
      nickName: userInfoRes.userInfo.nickName,
      avatarUrl: userInfoRes.userInfo.avatarUrl,
    }

    // 4. 调用云函数
    const cloudRes = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.LOGIN,
      data: { userInfo, healthRecords },
    })

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
 * @param {string} property - 要更新的属性名
 * @param {any} value - 属性值
 * @returns {Promise<Object>} 更新结果
 */
async function updateUserInfo(property, value) {
  try {
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.UPDATE_USER_INFO,
      data: { property, value },
    })

    if (!res || !res.result) {
      throw new Error('无效更新响应')
    }

    const { success, error } = res.result

    if (success) {
      return res.result
    } else {
      Logger.error('userService: 更新失败:', error)
      throw new Error(error || '更新失败')
    }
  } catch (err) {
    Logger.error('userService: 异常:', err)
    throw err
  }
}

export default {
  login,
  updateUserInfo,
}
