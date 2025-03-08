/**
 * 错误处理工具
 * 提供统一的错误处理机制
 */

import Logger from './logger';

/**
 * 错误类型枚举
 */
const ErrorType = {
  NETWORK: 'NETWORK',
  API: 'API',
  AUTH: 'AUTH',
  VALIDATION: 'VALIDATION',
  PERMISSION: 'PERMISSION',
  UNKNOWN: 'UNKNOWN'
};

/**
 * 应用错误类
 */
class AppError extends Error {
  constructor(message, type = ErrorType.UNKNOWN, originalError = null) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.originalError = originalError;
    this.timestamp = new Date();
  }
}

/**
 * 处理错误
 * @param {Error} error - 错误对象
 * @param {Object} options - 处理选项
 * @param {Boolean} options.showToast - 是否显示Toast提示
 * @param {Boolean} options.showModal - 是否显示Modal对话框
 * @param {Function} options.callback - 错误处理后的回调函数
 */
function handleError(error, options = {}) {
  const { showToast = true, showModal = false, callback = null } = options;
  
  // 记录错误日志
  Logger.error('应用错误', error);
  
  // 获取错误信息和类型
  let errorMessage = '发生未知错误，请稍后再试';
  let errorType = ErrorType.UNKNOWN;
  
  if (error instanceof AppError) {
    errorMessage = error.message;
    errorType = error.type;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  // 根据错误类型处理
  switch (errorType) {
    case ErrorType.NETWORK:
      errorMessage = '网络连接失败，请检查网络设置';
      break;
    case ErrorType.API:
      errorMessage = '服务请求失败，请稍后再试';
      break;
    case ErrorType.AUTH:
      errorMessage = '登录状态已失效，请重新登录';
      // 可以在这里处理登录失效的情况，如跳转到登录页面
      break;
    case ErrorType.PERMISSION:
      errorMessage = '没有操作权限';
      break;
    case ErrorType.VALIDATION:
      // 验证错误通常有具体的错误信息，直接使用
      break;
    default:
      // 使用默认错误信息
      break;
  }
  
  // 显示错误提示
  if (showToast) {
    wx.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 2000
    });
  }
  
  if (showModal) {
    wx.showModal({
      title: '错误提示',
      content: errorMessage,
      showCancel: false
    });
  }
  
  // 执行回调
  if (typeof callback === 'function') {
    callback(error);
  }
  
  return errorMessage;
}

/**
 * 创建网络错误
 * @param {String} message - 错误信息
 * @param {Error} originalError - 原始错误
 * @returns {AppError} 应用错误对象
 */
function createNetworkError(message, originalError = null) {
  return new AppError(message, ErrorType.NETWORK, originalError);
}

/**
 * 创建API错误
 * @param {String} message - 错误信息
 * @param {Error} originalError - 原始错误
 * @returns {AppError} 应用错误对象
 */
function createApiError(message, originalError = null) {
  return new AppError(message, ErrorType.API, originalError);
}

/**
 * 创建认证错误
 * @param {String} message - 错误信息
 * @param {Error} originalError - 原始错误
 * @returns {AppError} 应用错误对象
 */
function createAuthError(message, originalError = null) {
  return new AppError(message, ErrorType.AUTH, originalError);
}

/**
 * 创建验证错误
 * @param {String} message - 错误信息
 * @param {Error} originalError - 原始错误
 * @returns {AppError} 应用错误对象
 */
function createValidationError(message, originalError = null) {
  return new AppError(message, ErrorType.VALIDATION, originalError);
}

/**
 * 创建权限错误
 * @param {String} message - 错误信息
 * @param {Error} originalError - 原始错误
 * @returns {AppError} 应用错误对象
 */
function createPermissionError(message, originalError = null) {
  return new AppError(message, ErrorType.PERMISSION, originalError);
}

export default {
  ErrorType,
  AppError,
  handleError,
  createNetworkError,
  createApiError,
  createAuthError,
  createValidationError,
  createPermissionError
}; 