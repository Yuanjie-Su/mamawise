/**
 * 云函数服务
 * 提供统一的云函数调用接口
 */

import Logger from '../utils/logger';
import errorHandler from '../utils/errorHandler';
import appConfig from '../config/appConfig';

const { CLOUD_FUNCTIONS } = appConfig;

/**
 * 调用云函数
 * @param {String} name - 云函数名称
 * @param {Object} data - 请求数据
 * @returns {Promise} 云函数调用结果Promise
 */
function callFunction(name, data = {}) {
  // 记录云函数调用日志
  Logger.debug(`调用云函数: ${name}`, data);
  
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data,
      success: (res) => {
        // 记录云函数响应日志
        Logger.debug(`云函数响应: ${name}`, res);
        
        // 检查云函数返回的结果
        if (res.result && res.result.success) {
          resolve(res.result);
        } else {
          // 处理云函数错误
          const errorMessage = res.result?.message || '云函数调用失败';
          const error = errorHandler.createApiError(
            errorMessage,
            new Error(JSON.stringify(res.result))
          );
          reject(error);
        }
      },
      fail: (err) => {
        // 记录云函数调用失败日志
        Logger.error(`云函数调用失败: ${name}`, err);
        
        // 创建网络错误
        const error = errorHandler.createNetworkError(
          '云函数调用失败',
          new Error(err.errMsg || '未知错误')
        );
        reject(error);
      }
    });
  });
}

/**
 * 用户登录
 * @returns {Promise} 登录结果Promise
 */
function login() {
  return callFunction(CLOUD_FUNCTIONS.LOGIN);
}

/**
 * 获取用户信息
 * @returns {Promise} 用户信息Promise
 */
function getUserInfo() {
  return callFunction(CLOUD_FUNCTIONS.GET_USER_INFO);
}

/**
 * 更新用户信息
 * @param {Object} userInfo - 用户信息
 * @returns {Promise} 更新结果Promise
 */
function updateUserInfo(userInfo) {
  return callFunction(CLOUD_FUNCTIONS.UPDATE_USER_INFO, { userInfo });
}

/**
 * 获取健康记录
 * @returns {Promise} 健康记录Promise
 */
function getHealthRecords() {
  return callFunction(CLOUD_FUNCTIONS.GET_HEALTH_RECORDS);
}

/**
 * 更新健康记录
 * @param {Object} healthRecords - 健康记录
 * @returns {Promise} 更新结果Promise
 */
function updateHealthRecords(healthRecords) {
  return callFunction(CLOUD_FUNCTIONS.UPDATE_HEALTH_RECORDS, { healthRecords });
}

/**
 * 生成文本
 * @param {Object} params - 生成参数
 * @returns {Promise} 生成结果Promise
 */
function generateText(params) {
  return callFunction(CLOUD_FUNCTIONS.GENERATE_TEXT, params);
}

export default {
  callFunction,
  login,
  getUserInfo,
  updateUserInfo,
  getHealthRecords,
  updateHealthRecords,
  generateText
}; 