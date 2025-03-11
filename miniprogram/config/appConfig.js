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
  HAS_HEALTH_RECORDS: 'hasHealthRecords',
  CURRENT_MODEL: 'currentModel',
  CHAT_HISTORY: 'chatHistory',
};

// API配置
const API_CONFIG = {
  // 其他API配置
};

// 云函数名称
const CLOUD_FUNCTIONS = {
  LOGIN: 'login',
  GET_USER_INFO: 'getUserInfo',
  UPDATE_USER_INFO: 'updateUserInfo',
  GET_HEALTH_RECORDS: 'getHealthRecords',
  UPDATE_HEALTH_RECORDS: 'updateHealthRecords',
  GET_CHAT_HISTORY: 'getChatHistory',
  GET_PROMPT: 'getPrompt',
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

// AI模型配置
const MODEL_CONFIG = {
  'DeepSeek-v3': {
    id: 'DeepSeek-v3',
    name: 'DeepSeek-v3',
    apiModel: 'deepseek-v3',
    description: '通用性混合专家'
  },
  'DeepSeek-r1': {
    id: 'DeepSeek-r1',
    name: 'DeepSeek-r1',
    apiModel: 'deepseek-r1',
    description: '专注于复杂推理任务'
  }
};

// 可用的AI模型选项
const MODEL_OPTIONS = [
  MODEL_CONFIG['DeepSeek-v3'],
  MODEL_CONFIG['DeepSeek-r1']
];

export default {
  APP_VERSION,
  STORAGE_KEYS,
  API_CONFIG,
  CLOUD_FUNCTIONS,
  DEFAULT_CONFIG,
  MODEL_CONFIG,
  MODEL_OPTIONS
}; 