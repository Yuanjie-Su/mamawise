/**
 * 日志模块
 * 提供统一的日志记录功能
 */

// 日志级别
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

// 当前日志级别，可以根据环境配置
const CURRENT_LOG_LEVEL = LOG_LEVELS.DEBUG;

// 是否在控制台输出日志
const CONSOLE_OUTPUT = true;

// 是否保存日志到存储
const STORAGE_OUTPUT = false;

// 最大日志条数
const MAX_LOG_COUNT = 1000;

// 日志存储键名
const LOG_STORAGE_KEY = 'app_logs';

/**
 * 记录日志
 * @param {string} level - 日志级别
 * @param {string} message - 日志消息
 * @param {any} data - 附加数据
 */
function log(level, message, data) {
  // 检查日志级别
  if (LOG_LEVELS[level] < CURRENT_LOG_LEVEL) {
    return;
  }
  
  // 创建日志条目
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level,
    message: message,
    data: data
  };
  
  // 控制台输出
  if (CONSOLE_OUTPUT) {
    switch (level) {
      case 'DEBUG':
        console.log(`[${logEntry.level}] ${logEntry.message}`, data || '');
        break;
      case 'INFO':
        console.info(`[${logEntry.level}] ${logEntry.message}`, data || '');
        break;
      case 'WARN':
        console.warn(`[${logEntry.level}] ${logEntry.message}`, data || '');
        break;
      case 'ERROR':
        console.error(`[${logEntry.level}] ${logEntry.message}`, data || '');
        break;
    }
  }
  
  // 存储日志
  if (STORAGE_OUTPUT) {
    try {
      // 获取现有日志
      let logs = wx.getStorageSync(LOG_STORAGE_KEY) || [];
      
      // 添加新日志
      logs.push(logEntry);
      
      // 如果超过最大条数，删除旧日志
      if (logs.length > MAX_LOG_COUNT) {
        logs = logs.slice(-MAX_LOG_COUNT);
      }
      
      // 保存日志
      wx.setStorageSync(LOG_STORAGE_KEY, logs);
    } catch (error) {
      console.error('保存日志失败', error);
    }
  }
}

// 导出日志方法
module.exports = {
  debug: (message, data) => log('DEBUG', message, data),
  info: (message, data) => log('INFO', message, data),
  warn: (message, data) => log('WARN', message, data),
  error: (message, data) => log('ERROR', message, data),
  
  // 获取所有日志
  getLogs: () => {
    try {
      return wx.getStorageSync(LOG_STORAGE_KEY) || [];
    } catch (error) {
      console.error('获取日志失败', error);
      return [];
    }
  },
  
  // 清空日志
  clearLogs: () => {
    try {
      wx.removeStorageSync(LOG_STORAGE_KEY);
    } catch (error) {
      console.error('清空日志失败', error);
    }
  }
}; 