/**
 * 用户服务
 * 负责处理用户登录、注册、个人信息和健康记录
 */

import Logger from '../utils/logger';
import appConfig from '../config/appConfig';
// import aiService from './aiService';

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig;

/**
 * 用户登录
 * @returns {Promise<Object>} 登录结果
 */
function login(code, userInfo) {
  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '登录中...' });

    // 调用云函数登录
    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.LOGIN,
      data: {
        code: code,
        userInfo: userInfo
      }
    }).then(res => {
      wx.hideLoading();

      // 验证返回数据格式
      if(!res || !res.result) {
        reject(new Error('无效登录响应'));
        return;
      }

      const { success, error } = res.result;

      if (success) {
        resolve(res.result);
      } else {
        reject(new Error(error || '登录失败'));
      }
    }).catch(err => {
      wx.hideLoading();
      reject(err);
    });
  });
}

/**
 * 获取用户信息
 * @returns {Promise<Object>} 用户信息
 */
function getUserInfo() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.GET_USER_INFO,
      success: (res) => {
        if (res.result && res.result.success) {
          const userInfo = res.result.data;
          // 保存到本地缓存
          wx.setStorageSync(STORAGE_KEYS.USER_INFO, userInfo);
          resolve(userInfo);
        } else {
          reject(new Error(res.result.error || '获取用户信息失败'));
        }
      },
      fail: (err) => {
        Logger.error('获取用户信息失败', err);
        reject(err);
      }
    });
  });
}

/**
 * 更新用户个人信息
 * @param {Object} userInfo - 用户个人信息
 * @returns {Promise<Object>} 更新结果
 */
function updateUserInfo(userInfo) {
  return new Promise((resolve, reject) => {
    wx.showLoading({ title: '保存中...' });
    
    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.UPDATE_USER_INFO,
      data: { userInfo },
      success: (res) => {
        wx.hideLoading();
        
        if (res.result && res.result.success) {
          // 更新成功，更新本地缓存
          const updatedUserInfo = {
            ...wx.getStorageSync(STORAGE_KEYS.USER_INFO),
            ...userInfo,
            hasPersonalInfo: true
          };
          
          wx.setStorageSync(STORAGE_KEYS.USER_INFO, updatedUserInfo);
          resolve(res.result);
        } else {
          // 更新失败
          reject(new Error(res.result.error || '更新个人信息失败'));
        }
      },
      fail: (err) => {
        wx.hideLoading();
        Logger.error('更新个人信息失败', err);
        reject(err);
      }
    });
  });
}

/**
 * 用户登出
 * @returns {Promise<boolean>} 登出结果
 */
function logout() {
  return new Promise((resolve) => {
    // 清除本地存储中的用户信息和登录状态
    wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
    wx.removeStorageSync(STORAGE_KEYS.LOGIN_STATUS);
    wx.removeStorageSync(STORAGE_KEYS.HEALTH_RECORDS);
    wx.removeStorageSync(STORAGE_KEYS.HAS_HEALTH_RECORDS);
    
    resolve(true);
  });
}

export default {
  login,
  logout,
  getUserInfo,
  updateUserInfo
}; 