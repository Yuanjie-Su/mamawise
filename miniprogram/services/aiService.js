/**
 * AI服务
 * 负责处理与AI模型交互的相关功能
 */

import Logger from '../utils/logger';

// 控制生成状态的标志
let isGenerationStopped = false;

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
  MODEL_CONFIG['DeepSeek-v3'],
  MODEL_CONFIG['DeepSeek-r1']
];

/**
 * 构建系统提示词
 * @param {Object} params - 构建提示词所需的参数
 * @returns {String} 系统提示词
 */
function buildSystemPrompt(params) {
  const { isLoggedIn, hasPersonalInfo, healthRecords, solarTermInfo } = params;
  
  let systemPrompt = `你是一位专业的孕产妇健康顾问，你的职责是为孕期和产后的妈妈提供专业、温暖的健康指导和建议。
请以友善、专业的语气回答用户的问题，避免过于冰冷或机械的回复。
你的回答应该基于科学依据，但表达方式要平易近人，避免过多专业术语。
如果用户询问的问题超出你的知识范围或不确定的内容，请诚实告知并建议用户咨询专业医生。
请记住，你的目标是帮助孕产妇获得正确的健康信息，缓解她们的焦虑，并提供实用的建议。
回复内容需要通过符号、表情等元素润色，尽量丰富，但不能有MarkDown元素。`;
  
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
    // 重置停止标志
    isGenerationStopped = false;
    
    // 用于跟踪是否已接收到第一段内容
    let hasReceivedFirstContent = false;
    
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
      // 如果生成已被停止，中断循环
      if (isGenerationStopped) {
        Logger.info('AI回复生成已被用户终止');
        break;
      }
      
      if (event.data === '[DONE]') break;
      
      const data = JSON.parse(event.data);
      const text = data?.choices?.[0]?.delta?.content;
      
      if (text && onProgress) {
        // 对于deepseek-r1模型，处理开头的空白行问题
        let processedText = text;
        
        // 如果是deepseek-r1模型，且是第一次接收到内容，去除开头的空白行
        if (modelConfig.apiModel === 'deepseek-r1' && !hasReceivedFirstContent) {
          processedText = text.replace(/^\n+/, '');
          hasReceivedFirstContent = true;
        }
        
        onProgress(processedText);
      }
    }
    
    return true;
  } catch (error) {
    // 如果是因为用户终止而导致的错误，不需要抛出
    if (isGenerationStopped) {
      Logger.info('AI回复生成已被用户终止');
      return true;
    }
    
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
    
    // 检查是否有机器回复
    const hasSystemMessage = messages.some(msg => msg.type === 'system');
    
    // 构建提示词
    let prompt;
    
    if (hasSystemMessage) {
      // 如果有机器回复，基于最近的一条机器回复生成相关问题
      prompt = '基于以下聊天历史，特别是最近的AI回复，生成3个用户可能想问的后续问题。这些问题应该与孕期健康、胎儿发育、产后护理或相关话题有关，并且与聊天内容紧密相关。只返回问题，每行一个，不要有编号或其他格式。\n\n聊天历史：\n';
      
      // 获取最近的5条消息作为上下文
      const recentMessages = messages.slice(-5);
      
      recentMessages.forEach(msg => {
        const role = msg.type === 'system' ? 'AI' : '用户';
        prompt += `${role}: ${msg.content}\n`;
      });
    } else {
      // 如果没有机器回复，基于用户的问题和可能的状态生成推荐问题
      prompt = '用户正在使用一个孕期健康咨询应用，但尚未收到AI回复。基于以下用户输入，生成3个适合用户当前状态的问题建议。这些问题应该与孕期健康、胎儿发育、产后护理或相关话题有关，并且考虑用户可能的需求。只返回问题，每行一个，每个问题不超过20个字，不要有编号或其他格式。\n\n用户输入：\n';
      
      // 获取用户的所有消息
      const userMessages = messages.filter(msg => msg.type === 'user');
      
      userMessages.forEach(msg => {
        prompt += `用户: ${msg.content}\n`;
      });
    }
    
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

/**
 * 将内容专业化处理
 * @param {String} content - 原始内容
 * @returns {Object} 处理后的结果，包含标题和内容
 */
async function professionalizeContent(content) {
  try {
    Logger.info('开始专业化处理内容');
    
    // 构建提示词
    const prompt = `将以下内容转化为更专业、简洁且结构清晰的格式，适合长期收藏和参考，附带标题：\n\n${content}`;
    
    // 调用deepseek-v3模型
    const model = wx.cloud.extend.AI.createModel("deepseek");
    const res = await model.generateText({
      model: "deepseek-v3",
      messages: [{ role: "user", content: prompt }],
    });
    
    console.log(res);
    // 解析结果，提取标题和内容
    // 假设AI返回的格式是"标题：xxx\n\n内容"
    let title = '收藏内容';
    let processedContent = result;
    
    // 尝试提取标题
    const titleMatch = result.match(/^(标题[:：]\s*)(.*?)(\n|$)/);
    if (titleMatch && titleMatch[2]) {
      title = titleMatch[2].trim();
      // 从内容中移除标题行
      processedContent = result.replace(titleMatch[0], '').trim();
    } else {
      // 如果没有明确的标题格式，尝试使用第一行作为标题
      const lines = result.split('\n');
      if (lines.length > 0 && lines[0].length < 50) {
        title = lines[0].trim();
        processedContent = lines.slice(1).join('\n').trim();
      }
    }
    
    Logger.info('内容专业化处理完成', { titleLength: title.length });
    
    return {
      title: title,
      content: processedContent
    };
  } catch (error) {
    Logger.error('内容专业化处理失败', error);
    throw error;
  }
}

/**
 * 停止AI回复生成
 */
function stopGeneration() {
  // 设置停止标志
  isGenerationStopped = true;
  Logger.info('已设置AI回复生成停止标志');
}

export default {
  MODEL_CONFIG,
  MODEL_OPTIONS,
  generateAIResponse,
  generateRecommendedQuestions,
  getDefaultRecommendedQuestions,
  buildSystemPrompt,
  professionalizeContent,
  stopGeneration
}; 