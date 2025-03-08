/**
 * 应用全局配置
 */

// 应用版本
const APP_VERSION = '1.0.0';

// 缓存键名
const STORAGE_KEYS = {
  USER_INFO: 'userInfo',
  LOGIN_STATUS: 'loginStatus',
  HEALTH_RECORDS: 'healthRecords',
  LAST_WEATHER_TIME: 'lastWeatherTime',
  WEATHER_INFO: 'weatherInfo',
  LOCATION_AUTH_REMINDED: 'hasLocationAuthReminded',
  CURRENT_MODEL: 'currentModel',
  CHAT_HISTORY: 'chatHistory'
};

// API配置
const API_CONFIG = {
  WEATHER_API_KEY: '1cd02e1b1c1a2105477a40ee5f37e9bd',
  WEATHER_API_URL: 'https://api.openweathermap.org/data/2.5/weather'
};

// 云函数名称
const CLOUD_FUNCTIONS = {
  LOGIN: 'login',
  GET_USER_INFO: 'getUserInfo',
  UPDATE_USER_INFO: 'updateUserInfo',
  GET_HEALTH_RECORDS: 'getHealthRecords',
  UPDATE_HEALTH_RECORDS: 'updateHealthRecords',
  GENERATE_TEXT: 'generateText'
};

// 默认配置
const DEFAULT_CONFIG = {
  // 默认天气信息
  DEFAULT_WEATHER: {
    icon: '',
    temperature: '--'
  },
  
  // 默认推荐问题
  DEFAULT_QUESTIONS: [
    '孕期应该如何保持健康的饮食习惯？',
    '胎动有什么规律和注意事项？',
    '产前准备需要做哪些事情？',
    '如何缓解孕期常见的不适症状？',
    '产后恢复有哪些注意事项？'
  ]
};

export default {
  APP_VERSION,
  STORAGE_KEYS,
  API_CONFIG,
  CLOUD_FUNCTIONS,
  DEFAULT_CONFIG
}; 