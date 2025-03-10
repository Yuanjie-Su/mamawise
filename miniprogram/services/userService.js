/**
 * 用户服务
 * 负责处理用户登录、注册、个人信息和健康记录
 */

import Logger from '../utils/logger';
import appConfig from '../config/appConfig';
import aiService from './aiService';

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig;

/**
 * 检查用户登录状态
 * @returns {Promise<Object>} 包含登录状态和用户信息的对象
 */
function checkLoginStatus() {
  return new Promise((resolve) => {
    // 从本地存储获取登录状态
    const loginStatus = wx.getStorageSync(STORAGE_KEYS.LOGIN_STATUS) || false;
    
    if (loginStatus) {
      // 已登录，获取用户信息
      const userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO) || null;
      const hasPersonalInfo = userInfo && userInfo.hasPersonalInfo || false;
      
      resolve({
        isLoggedIn: true,
        hasPersonalInfo,
        userInfo
      });
    } else {
      // 未登录
      resolve({
        isLoggedIn: false,
        hasPersonalInfo: false,
        userInfo: null
      });
    }
  });
}

/**
 * 用户登录
 * @returns {Promise<Object>} 登录结果
 */
function login() {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.LOGIN,
      success: (res) => {
        if (res.result && res.result.success) {
          // 登录成功，保存登录状态和用户信息
          wx.setStorageSync(STORAGE_KEYS.LOGIN_STATUS, true);
          wx.setStorageSync(STORAGE_KEYS.USER_INFO, res.result.userInfo);
          
          resolve({
            isLoggedIn: true,
            hasPersonalInfo: res.result.userInfo.hasPersonalInfo || false,
            userInfo: res.result.userInfo
          });
        } else {
          // 登录失败
          reject(new Error(res.result.message || '登录失败'));
        }
      },
      fail: (err) => {
        Logger.error('登录失败', err);
        reject(err);
      }
    });
  });
}

/**
 * 获取用户健康记录
 * @returns {Promise<Object>} 健康记录对象
 */
function getHealthRecords() {
  return new Promise((resolve, reject) => {
    // 先检查本地缓存
    const cachedHealthRecords = wx.getStorageSync(STORAGE_KEYS.HEALTH_RECORDS);
    if (cachedHealthRecords) {
      resolve(cachedHealthRecords);
      return;
    }
    
    // 如果没有缓存，从云端获取
    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.GET_HEALTH_RECORDS,
      success: (res) => {
        if (res.result && res.result.success) {
          // 获取成功，保存到本地缓存
          const healthRecords = res.result.healthRecords;
          wx.setStorageSync(STORAGE_KEYS.HEALTH_RECORDS, healthRecords);
          resolve(healthRecords);
        } else {
          // 获取失败
          reject(new Error(res.result.message || '获取健康记录失败'));
        }
      },
      fail: (err) => {
        Logger.error('获取健康记录失败', err);
        reject(err);
      }
    });
  });
}

/**
 * 更新用户健康记录
 * @param {Object} healthRecords - 健康记录对象
 * @returns {Promise<Object>} 更新结果
 */
function updateHealthRecords(healthRecords) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.UPDATE_HEALTH_RECORDS,
      data: { healthRecords },
      success: async (res) => {
        if (res.result && res.result.success) {
          // 更新成功，更新本地缓存
          wx.setStorageSync(STORAGE_KEYS.HEALTH_RECORDS, healthRecords);
          
          // 根据健康记录生成个性化推荐问题
          try {
            // 获取当前节气信息
            const solarTermInfo = wx.getStorageSync(STORAGE_KEYS.SOLAR_TERM_INFO) || '';
            const additionalInfo = { solarTermInfo };
            
            // 异步生成个性化推荐问题，不阻塞主流程
            aiService.generatePersonalizedQuestions(healthRecords, additionalInfo)
              .then(success => {
                Logger.info('健康记录更新后生成个性化推荐问题', { success });
              })
              .catch(err => {
                Logger.error('健康记录更新后生成个性化推荐问题失败', err);
              });
          } catch (error) {
            Logger.error('尝试生成个性化推荐问题失败', error);
          }
          
          resolve(res.result);
        } else {
          // 更新失败
          reject(new Error(res.result.message || '更新健康记录失败'));
        }
      },
      fail: (err) => {
        Logger.error('更新健康记录失败', err);
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
    wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.UPDATE_USER_INFO,
      data: { userInfo },
      success: (res) => {
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
          reject(new Error(res.result.message || '更新个人信息失败'));
        }
      },
      fail: (err) => {
        Logger.error('更新个人信息失败', err);
        reject(err);
      }
    });
  });
}

/**
 * 退出登录
 * @returns {Promise<void>}
 */
function logout() {
  return new Promise((resolve) => {
    // 清除登录状态和用户信息
    wx.removeStorageSync(STORAGE_KEYS.LOGIN_STATUS);
    wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
    wx.removeStorageSync(STORAGE_KEYS.HEALTH_RECORDS);
    
    resolve();
  });
}

export default {
  checkLoginStatus,
  login,
  logout,
  getHealthRecords,
  updateHealthRecords,
  updateUserInfo
}; 