/**
 * AI服务
 * 负责处理与AI模型交互的相关功能
 */

import Logger from '../utils/logger';

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

// 可用的模型选项
const MODEL_OPTIONS = [
  MODEL_CONFIG['DeepSeek-r1'],
  MODEL_CONFIG['DeepSeek-v3']
];

/**
 * 构建系统提示词
 * @param {Object} params - 构建提示词所需的参数
 * @returns {String} 系统提示词
 */
function buildSystemPrompt(params) {
  const { isLoggedIn, hasPersonalInfo, healthRecords, weatherInfo, solarTermInfo } = params;
  
  let systemPrompt = `你是一位专业的孕产妇健康顾问，名为"妈妈智慧"，你的职责是为孕期和产后的妈妈提供专业、温暖的健康指导和建议。
请以友善、专业的语气回答用户的问题，避免过于冰冷或机械的回复。
你的回答应该基于科学依据，但表达方式要平易近人，避免过多专业术语。
如果用户询问的问题超出你的知识范围或不确定的内容，请诚实告知并建议用户咨询专业医生。
请记住，你的目标是帮助孕产妇获得正确的健康信息，缓解她们的焦虑，并提供实用的建议。`;

  // 添加天气和节气信息
  if (weatherInfo && weatherInfo.temperature) {
    systemPrompt += `\n\n当前天气情况：温度${weatherInfo.temperature}°C。`;
  }
  
  if (solarTermInfo) {
    systemPrompt += `\n当前节气：${solarTermInfo}。`;
  }
  
  // 添加用户健康记录信息
  if (isLoggedIn && hasPersonalInfo && healthRecords) {
    systemPrompt += `\n\n用户健康记录信息：
- 预产期：${healthRecords.dueDate || '未知'}
- 孕周：${healthRecords.pregnancyWeek || '未知'}
- 身高：${healthRecords.height || '未知'} cm
- 孕前体重：${healthRecords.prePregnancyWeight || '未知'} kg
- 当前体重：${healthRecords.currentWeight || '未知'} kg`;
  }
  
  return systemPrompt;
}

/**
 * 生成AI回复
 * @param {Array} messages - 消息历史
 * @param {String} userQuery - 用户问题
 * @param {Object} contextInfo - 上下文信息
 * @param {Function} onProgress - 流式响应的回调函数
 * @returns {Promise} 返回生成结果的Promise
 */
async function generateAIResponse(messages, userQuery, contextInfo, onProgress) {
  try {
    // 构建系统提示词
    const systemPrompt = buildSystemPrompt(contextInfo);
    
    // 构建消息历史
    const messageHistory = messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
    
    // 添加系统提示词
    messageHistory.unshift({
      role: 'system',
      content: systemPrompt
    });
    
    // 获取当前选择的模型配置
    const modelConfig = MODEL_CONFIG[contextInfo.currentModel];
    
    if (!modelConfig) {
      throw new Error(`未找到模型配置: ${contextInfo.currentModel}`);
    }
    
    // 创建DeepSeek模型实例
    const model = wx.cloud.extend.AI.createModel('deepseek');
    
    // 使用流式响应
    const res = await model.streamText({
      data: {
        model: modelConfig.apiModel,
        messages: [
          ...messageHistory,
          {
            role: 'user',
            content: userQuery
          }
        ]
      }
    });
    
    // 处理DeepSeek模型的eventStream响应
    for await (let event of res.eventStream) {
      if (event.data === '[DONE]') break;
      
      const data = JSON.parse(event.data);
      const text = data?.choices?.[0]?.delta?.content;
      
      if (text && onProgress) {
        onProgress(text);
      }
    }
    
    return true;
  } catch (error) {
    Logger.error('生成AI回复时出错:', error);
    throw error;
  }
}

/**
 * 生成推荐问题
 * @param {Array} messages - 消息历史
 * @returns {Promise<Array>} 返回推荐问题数组的Promise
 */
async function generateRecommendedQuestions(messages) {
  try {
    // 如果没有消息历史，使用默认的提示词
    if (!messages || messages.length === 0) {
      return getDefaultRecommendedQuestions();
    }
    
    // 构建提示词，基于聊天历史生成相关问题
    let prompt = '基于以下聊天历史，生成3个用户可能想问的后续问题。这些问题应该与孕期健康、胎儿发育、产后护理或相关话题有关，并且与聊天内容相关。只返回问题，每行一个，不要有编号或其他格式。\n\n聊天历史：\n';
    
    // 获取最近的5条消息作为上下文
    const recentMessages = messages.slice(-5);
    
    recentMessages.forEach(msg => {
      const role = msg.type === 'system' ? 'AI' : '用户';
      prompt += `${role}: ${msg.content}\n`;
    });
    
    // 使用当前选择的模型生成推荐问题
    const model = wx.cloud.extend.AI.createModel("deepseek");
    // deepseek-v3响应速度快
    const res = await model.generateText({
      model: "deepseek-v3",
      messages: [{ role: "user", content: prompt }],
    });

    if (res) {
      // 处理返回的文本，分割成问题列表
      const generatedText = res.choices[0].message.content;
      const questions = generatedText.split('\n').filter(q => q.trim().length > 0);
      
      // 如果生成的问题不足3个，补充一些通用问题
      const defaultQuestions = getDefaultQuestions();
      
      let finalQuestions = [...questions];
      while (finalQuestions.length < 3) {
        const randomQuestion = getRandomItems(defaultQuestions, 1)[0];
        if (!finalQuestions.includes(randomQuestion)) {
          finalQuestions.push(randomQuestion);
        }
      }
      
      // 如果生成的问题超过3个，只取前3个
      finalQuestions = finalQuestions.slice(0, 3);
      
      return finalQuestions;
    } else {
      // 如果API调用失败，使用默认问题
      return getDefaultRecommendedQuestions();
    }
  } catch (error) {
    Logger.error('生成推荐问题失败', error);
    // 出错时使用默认问题
    return getDefaultRecommendedQuestions();
  }
}

/**
 * 获取默认推荐问题
 * @returns {Array} 返回3个随机的默认问题
 */
function getDefaultRecommendedQuestions() {
  const defaultQuestions = getDefaultQuestions();
  return getRandomItems(defaultQuestions, 3);
}

/**
 * 获取默认问题列表
 * @returns {Array} 默认问题列表
 */
function getDefaultQuestions() {
  return [
    '孕期应该如何保持健康的饮食习惯？',
    '胎动有什么规律和注意事项？',
    '产前准备需要做哪些事情？',
    '如何缓解孕期常见的不适症状？',
    '产后恢复有哪些注意事项？',
    '孕期运动有哪些注意事项？',
    '孕期情绪波动如何调节？',
    '新生儿护理有哪些基本知识？',
    '母乳喂养有哪些技巧和注意事项？',
    '如何科学安排产检时间？'
  ];
}

/**
 * 从数组中随机获取指定数量的元素
 * @param {Array} array - 源数组
 * @param {Number} count - 需要获取的元素数量
 * @returns {Array} 随机选取的元素数组
 */
function getRandomItems(array, count) {
  const shuffled = array.slice();
  let i = array.length;
  let temp, index;
  
  // Fisher-Yates 洗牌算法
  while (i--) {
    index = Math.floor((i + 1) * Math.random());
    temp = shuffled[index];
    shuffled[index] = shuffled[i];
    shuffled[i] = temp;
  }
  
  return shuffled.slice(0, count);
}

export default {
  MODEL_CONFIG,
  MODEL_OPTIONS,
  generateAIResponse,
  generateRecommendedQuestions,
  getDefaultRecommendedQuestions,
  buildSystemPrompt
}; 