/**
 * 应用全局配置
 */

// 应用版本
const APP_VERSION = '1.0.0'

// 缓存键名
const STORAGE_KEYS = {
  USER_INFO: 'userInfo', // 用户信息
  IS_LOGGED_IN: 'isLoggedIn', // 登录状态
  CURRENT_MODEL: 'currentModel', // 当前模型
  CHAT_HISTORY: 'chatHistory', // 聊天历史
  HEALTH_RECORDS_PROMPT: 'healthRecordsPrompt', // 健康记录提示词
  HEALTH_RECORDS: 'healthRecords', // 健康记录
  NOTES: 'notes', // 笔记 
  CHAT_HISTORY_UNSAVED_COUNTER: 'chatHistoryUnsavedCounter', // 未保存聊天记录计数器
  NOTES_CHANGED: 'notesChanged', // 笔记列表是否发生变化
  HEALTH_RECORDS_PROMPT_CHANGED: 'healthRecordsPromptChanged', // 健康记录提示词是否发生变化
}

// API配置
const API_CONFIG = {
  // 其他API配置
}

const DEFAULT_HEALTH_RECORDS = {
  pregnancyInfo: {},
  allergyInfo: [],
  dietPreference: [],
  otherInfo: '',
  bloodPressureRecords: [],
  weightRecords: [],
  bloodSugarRecords: [],
  temperatureRecords: [],
  heartRateRecords: [],
  fetalMovementRecords: [],
  medications: [],
}
// 云函数名称
const CLOUD_FUNCTIONS = {
  LOGIN: 'login',
  ADD_CHAT_HISTORY: 'addChatHistory',
  ADD_HEALTH_RECORD: 'addHealthRecord',
  UPDATE_NOTES: 'updateNotes',
  CLEAR_CHAT_HISTORY: 'clearChatHistory',
  DELETE_NOTE: 'deleteNote',
  DELETE_HEALTH_RECORD: 'deleteHealthRecord',
  DELETE_USER_INFO: 'deleteUserInfo',
  DELETE_CHAT_HISTORY: 'deleteChatHistory',
  UPDATE_USER_INFO: 'updateUserInfo',
  GET_HEALTH_RECORDS: 'getHealthRecords',
  GET_PROMPT: 'getPrompt',
  GET_CHAT_HISTORY: 'getChatHistory',
  UPDATE_HEALTH_RECORDS: 'updateHealthRecords',
  UPDATE_PROMPT: 'updatePrompt',
  UPDATE_USER_INFO: 'updateUserInfo',
}

// 默认配置
const DEFAULT_AI_CONFIG = {
  // 默认模型
  MODEL: 'DeepSeek-v3',

  // 默认推荐问题
  RECOMMENDED_QUESTIONS: [
    '孕期应该如何保持健康的饮食习惯？',
    '如何缓解孕期常见的不适症状？',
    '孕期情绪波动如何调节？',
    '如何科学安排产检时间？',
    '孕期运动有哪些注意事项？',
    '胎动有什么规律和注意事项？',
    '产前准备需要做哪些事情？',
    '孕期营养补充有哪些建议？',
    '孕期睡眠质量不好怎么改善？',
    '孕期水肿应该如何缓解？',
    '孕期便秘有什么解决方法？',
    '孕期贫血如何预防和调理？',
    '产后恢复有哪些注意事项？',
    '新生儿护理有哪些基本知识？',
    '母乳喂养有哪些技巧和注意事项？',
    '如何判断是否临产？',
    '剖腹产和顺产各有什么优缺点？',
    '孕期皮肤变化如何护理？',
    '孕期牙齿保健有什么建议？',
  ],
}

// AI模型配置
const MODEL_CONFIG = {
  'DeepSeek-v3': {
    name: 'DeepSeek-v3',
    provider: 'deepseek',
    api: 'deepseek-v3',
    description: '通用性混合专家',
  },
  'DeepSeek-r1': {
    name: 'DeepSeek-r1',
    provider: 'deepseek',
    api: 'deepseek-r1',
    description: '专注于复杂推理任务',
  },
}

// 可用的AI模型选项
const MODEL_OPTIONS = [MODEL_CONFIG['DeepSeek-v3'], MODEL_CONFIG['DeepSeek-r1']]

export default {
  APP_VERSION,
  STORAGE_KEYS,
  API_CONFIG,
  CLOUD_FUNCTIONS,
  DEFAULT_AI_CONFIG,
  MODEL_CONFIG,
  MODEL_OPTIONS,
  DEFAULT_HEALTH_RECORDS,
}
