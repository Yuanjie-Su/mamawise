/**
 * HTTP服务
 * 提供统一的网络请求接口
 */

import Logger from '../utils/logger';
import errorHandler from '../utils/errorHandler';

// 默认请求配置
const defaultConfig = {
  baseURL: '',
  timeout: 10000,
  header: {
    'content-type': 'application/json'
  }
};

/**
 * 发送HTTP请求
 * @param {Object} options - 请求选项
 * @returns {Promise} 请求结果Promise
 */
function request(options) {
  const { url, method = 'GET', data = {}, header = {}, ...rest } = options;
  
  // 合并请求头
  const mergedHeader = { ...defaultConfig.header, ...header };
  
  // 记录请求日志
  Logger.debug(`HTTP请求: ${method} ${url}`, { data, header: mergedHeader });
  
  return new Promise((resolve, reject) => {
    wx.request({
      url: defaultConfig.baseURL + url,
      method,
      data,
      header: mergedHeader,
      timeout: defaultConfig.timeout,
      ...rest,
      success: (res) => {
        // 记录响应日志
        Logger.debug(`HTTP响应: ${method} ${url}`, res);
        
        // 检查HTTP状态码
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          // 处理HTTP错误
          const error = errorHandler.createApiError(
            `请求失败: ${res.statusCode}`,
            new Error(res.errMsg || '未知错误')
          );
          reject(error);
        }
      },
      fail: (err) => {
        // 记录错误日志
        Logger.error(`HTTP请求失败: ${method} ${url}`, err);
        
        // 创建网络错误
        const error = errorHandler.createNetworkError(
          '网络请求失败',
          new Error(err.errMsg || '未知错误')
        );
        reject(error);
      }
    });
  });
}

/**
 * 发送GET请求
 * @param {String} url - 请求URL
 * @param {Object} params - 请求参数
 * @param {Object} options - 其他选项
 * @returns {Promise} 请求结果Promise
 */
function get(url, params = {}, options = {}) {
  // 构建查询字符串
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  return request({
    url: fullUrl,
    method: 'GET',
    ...options
  });
}

/**
 * 发送POST请求
 * @param {String} url - 请求URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他选项
 * @returns {Promise} 请求结果Promise
 */
function post(url, data = {}, options = {}) {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
}

/**
 * 发送PUT请求
 * @param {String} url - 请求URL
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他选项
 * @returns {Promise} 请求结果Promise
 */
function put(url, data = {}, options = {}) {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
}

/**
 * 发送DELETE请求
 * @param {String} url - 请求URL
 * @param {Object} params - 请求参数
 * @param {Object} options - 其他选项
 * @returns {Promise} 请求结果Promise
 */
function del(url, params = {}, options = {}) {
  // 构建查询字符串
  const queryString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  
  const fullUrl = queryString ? `${url}?${queryString}` : url;
  
  return request({
    url: fullUrl,
    method: 'DELETE',
    ...options
  });
}

/**
 * 设置请求配置
 * @param {Object} config - 请求配置
 */
function setConfig(config) {
  Object.assign(defaultConfig, config);
}

export default {
  request,
  get,
  post,
  put,
  delete: del,
  setConfig
}; 