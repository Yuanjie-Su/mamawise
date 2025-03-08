/**
 * 应用状态管理模型
 * 提供全局状态管理和状态变更通知机制
 */

import Logger from '../utils/logger';
import appConfig from '../config/appConfig';

const { STORAGE_KEYS } = appConfig;

// 调试模式标志
let debugMode = false;

// 持久化配置
const persistConfig = {
  enabled: true,
  paths: ['user', 'ai.currentModel', 'environment'] // 需要持久化的路径
};

// 应用状态
let state = {
  // 用户信息
  user: {
    isLoggedIn: false,
    hasPersonalInfo: false,
    userInfo: null,
    healthRecords: null
  },
  
  // 环境信息
  environment: {
    weatherInfo: {
      icon: '',
      description: '',
      temperature: ''
    },
    solarTermInfo: ''
  },
  
  // AI模型配置
  ai: {
    currentModel: 'deepseek-r1',
    currentModelName: 'deepseek-r1'
  }
};

// 观察者映射表 - 按路径存储观察者
const pathObservers = new Map();

// 全局观察者列表
const globalObservers = [];

/**
 * 注册特定路径的状态变更观察者
 * @param {String|Function} pathOrCallback - 状态路径或回调函数
 * @param {Function} [callback] - 状态变更时的回调函数
 * @returns {Function} 用于取消注册的函数
 */
function subscribe(pathOrCallback, callback) {
  // 如果只提供了回调函数，则注册为全局观察者
  if (typeof pathOrCallback === 'function' && !callback) {
    globalObservers.push(pathOrCallback);
    return () => {
      const index = globalObservers.indexOf(pathOrCallback);
      if (index > -1) {
        globalObservers.splice(index, 1);
      }
    };
  }
  
  // 否则注册为特定路径的观察者
  const path = pathOrCallback;
  if (!pathObservers.has(path)) {
    pathObservers.set(path, []);
  }
  
  const observers = pathObservers.get(path);
  observers.push(callback);
  
  // 返回取消订阅的函数
  return () => {
    const observers = pathObservers.get(path);
    if (!observers) return;
    
    const index = observers.indexOf(callback);
    if (index > -1) {
      observers.splice(index, 1);
    }
    
    // 如果该路径没有观察者了，则删除该路径
    if (observers.length === 0) {
      pathObservers.delete(path);
    }
  };
}

/**
 * 通知路径相关的所有观察者状态已变更
 * @param {String} path - 变更的状态路径
 * @param {*} value - 新的状态值
 * @param {*} oldValue - 旧的状态值
 */
function notifyObservers(path, value, oldValue) {
  // 通知精确匹配的观察者
  if (pathObservers.has(path)) {
    const observers = pathObservers.get(path);
    observers.forEach(callback => {
      try {
        callback(value, oldValue, path);
      } catch (error) {
        Logger.error(`路径 '${path}' 的观察者回调执行错误`, error);
      }
    });
  }
  
  // 通知父路径的观察者
  const pathParts = path.split('.');
  while (pathParts.length > 1) {
    pathParts.pop();
    const parentPath = pathParts.join('.');
    
    if (pathObservers.has(parentPath)) {
      const parentValue = getState(parentPath);
      const observers = pathObservers.get(parentPath);
      
      observers.forEach(callback => {
        try {
          callback(parentValue, undefined, parentPath);
        } catch (error) {
          Logger.error(`父路径 '${parentPath}' 的观察者回调执行错误`, error);
        }
      });
    }
  }
  
  // 通知全局观察者
  globalObservers.forEach(callback => {
    try {
      callback(path, value, state);
    } catch (error) {
      Logger.error('全局状态观察者回调执行错误', error);
    }
  });
  
  // 调试日志
  if (debugMode) {
    console.log(`[AppState] 路径 '${path}' 从`, oldValue, '变更为', value);
  }
}

/**
 * 更新状态
 * @param {String} path - 状态路径，如 'user.isLoggedIn'
 * @param {*} value - 新的状态值
 * @param {Boolean} [shouldPersist=true] - 是否需要持久化
 */
function updateState(path, value, shouldPersist = true) {
  const oldValue = getState(path);
  
  // 如果值没有变化，则不更新
  if (JSON.stringify(oldValue) === JSON.stringify(value)) {
    return;
  }
  
  const pathParts = path.split('.');
  let current = state;
  
  // 遍历路径，直到倒数第二部分
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part];
  }
  
  // 设置最后一部分的值
  const lastPart = pathParts[pathParts.length - 1];
  current[lastPart] = value;
  
  // 通知观察者
  notifyObservers(path, value, oldValue);
  
  // 持久化状态
  if (shouldPersist && persistConfig.enabled) {
    persistState(path, value);
  }
}

/**
 * 批量更新状态
 * @param {Object} updates - 路径和值的映射对象
 * @param {Boolean} [shouldPersist=true] - 是否需要持久化
 */
function batchUpdate(updates, shouldPersist = true) {
  // 先收集所有更新，但不触发通知
  const oldValues = {};
  
  Object.entries(updates).forEach(([path, value]) => {
    oldValues[path] = getState(path);
    
    const pathParts = path.split('.');
    let current = state;
    
    // 遍历路径，直到倒数第二部分
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    // 设置最后一部分的值
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = value;
  });
  
  // 然后一次性触发所有通知
  Object.entries(updates).forEach(([path, value]) => {
    notifyObservers(path, value, oldValues[path]);
    
    // 持久化状态
    if (shouldPersist && persistConfig.enabled) {
      persistState(path, value);
    }
  });
}

/**
 * 获取状态
 * @param {String} path - 状态路径，如 'user.isLoggedIn'
 * @returns {*} 状态值
 */
function getState(path) {
  if (!path) {
    return { ...state }; // 返回整个状态的副本
  }
  
  const pathParts = path.split('.');
  let current = state;
  
  for (const part of pathParts) {
    if (current === undefined || current === null) {
      return undefined;
    }
    current = current[part];
  }
  
  // 返回深拷贝，避免直接修改状态
  return typeof current === 'object' && current !== null 
    ? JSON.parse(JSON.stringify(current)) 
    : current;
}

/**
 * 持久化特定路径的状态
 * @param {String} path - 状态路径
 * @param {*} value - 状态值
 */
function persistState(path, value) {
  // 检查是否需要持久化该路径
  const shouldPersist = persistConfig.paths.some(configPath => {
    return path === configPath || path.startsWith(`${configPath}.`);
  });
  
  if (!shouldPersist) return;
  
  try {
    // 根据路径确定存储键
    let storageKey;
    
    if (path === 'user.isLoggedIn' || path.startsWith('user.isLoggedIn.')) {
      storageKey = STORAGE_KEYS.LOGIN_STATUS;
    } else if (path === 'user.userInfo' || path.startsWith('user.userInfo.')) {
      storageKey = STORAGE_KEYS.USER_INFO;
    } else if (path === 'user.healthRecords' || path.startsWith('user.healthRecords.')) {
      storageKey = STORAGE_KEYS.HEALTH_RECORDS;
    } else if (path === 'ai.currentModel') {
      storageKey = STORAGE_KEYS.CURRENT_MODEL;
    } else if (path === 'environment.weatherInfo' || path.startsWith('environment.weatherInfo.')) {
      storageKey = STORAGE_KEYS.WEATHER_INFO;
    } else {
      // 对于其他路径，使用路径作为键
      storageKey = `app_state_${path.replace(/\./g, '_')}`;
    }
    
    // 存储值
    wx.setStorage({
      key: storageKey,
      data: value,
      fail: (err) => {
        Logger.error(`持久化状态失败: ${path}`, err);
      }
    });
  } catch (error) {
    Logger.error(`持久化状态出错: ${path}`, error);
  }
}

/**
 * 初始化应用状态
 * 从本地存储加载持久化的状态
 */
function initState() {
  try {
    // 加载用户登录状态
    const isLoggedIn = wx.getStorageSync(STORAGE_KEYS.LOGIN_STATUS) || false;
    updateState('user.isLoggedIn', isLoggedIn, false);
    
    // 如果已登录，加载用户信息
    if (isLoggedIn) {
      const userInfo = wx.getStorageSync(STORAGE_KEYS.USER_INFO);
      if (userInfo) {
        updateState('user.userInfo', userInfo, false);
        updateState('user.hasPersonalInfo', userInfo.hasPersonalInfo || false, false);
      }
      
      // 加载健康记录
      const healthRecords = wx.getStorageSync(STORAGE_KEYS.HEALTH_RECORDS);
      if (healthRecords) {
        updateState('user.healthRecords', healthRecords, false);
      }
    }
    
    // 加载上次使用的模型
    const lastUsedModel = wx.getStorageSync(STORAGE_KEYS.CURRENT_MODEL);
    if (lastUsedModel) {
      updateState('ai.currentModel', lastUsedModel, false);
    }
    
    // 加载天气信息
    const weatherInfo = wx.getStorageSync(STORAGE_KEYS.WEATHER_INFO);
    if (weatherInfo) {
      updateState('environment.weatherInfo', weatherInfo, false);
    }
    
    Logger.info('应用状态初始化完成');
  } catch (error) {
    Logger.error('初始化应用状态失败', error);
  }
}

/**
 * 启用调试模式
 * @param {Boolean} [enable=true] - 是否启用
 */
function enableDebug(enable = true) {
  debugMode = enable;
}

/**
 * 重置状态到初始值
 */
function resetState() {
  state = {
    user: {
      isLoggedIn: false,
      hasPersonalInfo: false,
      userInfo: null,
      healthRecords: null
    },
    environment: {
      weatherInfo: {
        icon: '',
        description: '',
        temperature: ''
      },
      solarTermInfo: ''
    },
    ai: {
      currentModel: 'deepseek-r1',
      currentModelName: 'deepseek-r1'
    }
  };
  
  // 清除本地存储
  persistConfig.paths.forEach(path => {
    const rootPath = path.split('.')[0];
    if (rootPath === 'user') {
      wx.removeStorageSync(STORAGE_KEYS.LOGIN_STATUS);
      wx.removeStorageSync(STORAGE_KEYS.USER_INFO);
      wx.removeStorageSync(STORAGE_KEYS.HEALTH_RECORDS);
    } else if (rootPath === 'ai') {
      wx.removeStorageSync(STORAGE_KEYS.CURRENT_MODEL);
    } else if (rootPath === 'environment') {
      wx.removeStorageSync(STORAGE_KEYS.WEATHER_INFO);
    }
  });
  
  // 通知观察者
  notifyObservers('', state, null);
  
  Logger.info('应用状态已重置');
}

export default {
  // 状态访问
  get: getState,
  set: updateState,
  update: batchUpdate,
  
  // 状态订阅
  subscribe,
  
  // 状态管理
  initState,
  resetState,
  
  // 调试
  enableDebug
}; 