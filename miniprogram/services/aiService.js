/**
 * AI服务
 * 负责处理与AI模型交互的相关功能
 */

import Logger from '../utils/logger';

// 控制生成状态的标志
let isGenerationStopped = false;

// 默认推荐问题列表
let generalQuestions = [
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
  '孕期牙齿保健有什么建议？'
];

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
如果用户询问的问题超出你的知识范围或不确定的内容，请诚实告知并建议用户咨询专业医生。
你的目标是帮助孕产妇获得正确的健康信息，缓解她们的焦虑，并提供实用的建议。
回复内容包含正文和标题。
正文不需要包含任何打招呼语句（如"您好"、"亲爱的准妈妈"等），需要通过表情元素润色，结构清晰，不能有MarkDown元素。
标题简短（不超过20个字）。
`;

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

  // 格式要求
  systemPrompt += `\n\n回复格式要求：
正文
--- 标题
`;

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
 * @param {Object} contextInfo - 上下文信息，包含用户健康记录等
 * @param {Number} questionCount - 需要生成的问题数量，默认为3
 * @returns {Promise<Array>} 返回推荐问题数组的Promise
 */
async function generateRecommendedQuestions(messages, contextInfo = {}, questionCount = 3) {
  try {
    // 检查是否有历史消息
    const hasMessages = messages && messages.length > 0;
    
    // 检查是否有AI回复
    const hasAIResponses = hasMessages && messages.some(msg => msg.type === 'system');
    
    // 根据不同情况构建不同的提示词
    let prompt;
    
    // 添加用户健康记录信息（如果有）
    const { isLoggedIn, hasPersonalInfo, healthRecords, solarTermInfo } = contextInfo || {};
    
    if (hasAIResponses) {
      // 有历史AI回复的情况
      prompt = `基于以下聊天历史和用户信息，生成${questionCount}个用户可能想继续问的问题。这些问题应该与孕期健康、胎儿发育、产后护理或相关话题有关，并且与聊天内容紧密相关。只返回问题，每行一个，不要有编号或其他格式。\n\n`;
      
      // 添加用户健康记录信息
      if (solarTermInfo) {
        prompt += `当前节气：${solarTermInfo}\n\n`;
      }
      
      if (isLoggedIn && hasPersonalInfo && healthRecords) {
        prompt += `用户健康记录信息：\n`;
        prompt += `- 预产期：${healthRecords.dueDate || '未知'}\n`;
        prompt += `- 孕周：${healthRecords.pregnancyWeek || '未知'}\n`;
        prompt += `- 身高：${healthRecords.height || '未知'} cm\n`;
        prompt += `- 孕前体重：${healthRecords.prePregnancyWeight || '未知'} kg\n`;
        prompt += `- 当前体重：${healthRecords.currentWeight || '未知'} kg\n\n`;
      }
      
      prompt += '聊天历史：\n';
      
      // 获取最近的5条消息作为上下文
      const recentMessages = messages.slice(-5);
      
      recentMessages.forEach(msg => {
        const role = msg.type === 'system' ? 'AI' : '用户';
        prompt += `${role}: ${msg.content}\n`;
      });
      
      prompt += `\n请基于上述聊天历史，生成${questionCount}个用户可能想继续问的问题，这些问题应该与最近的AI回复内容紧密相关。`;
    } else {
      // 没有历史AI回复或没有任何消息的情况
      prompt = `你是一位孕产妇健康顾问，请为用户生成${questionCount}个关于孕期健康、胎儿发育或产后护理的初始问题。这些问题应该对孕产妇有帮助，并且能够引导用户开始对话。只返回问题，每行一个，不要有编号或其他格式。\n\n`;
      
      // 添加用户健康记录信息
      if (solarTermInfo) {
        prompt += `当前节气：${solarTermInfo}\n\n`;
      }
      
      if (isLoggedIn && hasPersonalInfo && healthRecords) {
        prompt += `用户健康记录信息：\n`;
        prompt += `- 预产期：${healthRecords.dueDate || '未知'}\n`;
        prompt += `- 孕周：${healthRecords.pregnancyWeek || '未知'}\n`;
        prompt += `- 身高：${healthRecords.height || '未知'} cm\n`;
        prompt += `- 孕前体重：${healthRecords.prePregnancyWeight || '未知'} kg\n`;
        prompt += `- 当前体重：${healthRecords.currentWeight || '未知'} kg\n\n`;
        
        // 针对有健康记录但没有聊天历史的情况，提供更具针对性的指导
        prompt += `请基于用户的健康记录，特别是孕周（${healthRecords.pregnancyWeek || '未知'}）和预产期（${healthRecords.dueDate || '未知'}），生成最相关的问题。如果用户处于孕早期，关注孕吐、营养补充等；孕中期关注胎动、产检等；孕晚期关注临产准备、分娩方式等；产后关注恢复、哺乳等。\n\n`;
      } else {
        // 没有健康记录的情况
        prompt += '由于没有用户的具体健康记录，请生成适用于各个孕期阶段的通用问题，涵盖孕早期、孕中期、孕晚期和产后的常见关注点。\n\n';
      }
      
      // 如果有用户消息但没有AI回复，可能是用户刚刚提问
      if (hasMessages) {
        prompt += '用户最近的问题：\n';
        const userMessages = messages.filter(msg => msg.type === 'user').slice(-2);
        userMessages.forEach(msg => {
          prompt += `用户: ${msg.content}\n`;
        });
        prompt += `\n请基于用户的问题，生成${questionCount}个相关的后续问题。`;
      }
    }

    Logger.info('生成推荐问题的提示词', { promptLength: prompt.length, hasAIResponses, questionCount });

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

      // 如果生成的问题数量不足，从默认问题中补充
      if (questions.length < questionCount) {
        const defaultQuestions = getDefaultQuestions();
        const additionalQuestions = getRandomItems(
          defaultQuestions.filter(q => !questions.includes(q)), 
          questionCount - questions.length
        );
        return [...questions, ...additionalQuestions];
      }

      // 如果生成的问题数量超过需要的数量，只返回需要的数量
      return questions.slice(0, questionCount);
    } else {
      // 如果API调用失败，使用默认问题
      return getDefaultRecommendedQuestions(contextInfo, questionCount);
    }
  } catch (error) {
    Logger.error('生成推荐问题失败', error);
    // 出错时使用默认问题
    return getDefaultRecommendedQuestions(contextInfo, questionCount);
  }
}

/**
 * 获取默认推荐问题
 * @param
 * @returns {Promise<Array>} 返回推荐问题数组的Promise
 */
async function getDefaultRecommendedQuestions() {
  const defaultQuestions = getDefaultQuestions();
  return getRandomItems(defaultQuestions, 3);
}

/**
 * 获取默认问题列表
 * @returns {Array} 默认问题列表
 */
function getDefaultQuestions() {
  // 返回当前的generalQuestions
  return [...generalQuestions];
}

/**
 * 更新默认推荐问题列表
 * @param {Array} questions - 新的推荐问题列表
 */
function updateGeneralQuestions(questions) {
  if (Array.isArray(questions) && questions.length > 0) {
    generalQuestions = [...questions];
    Logger.info('已更新默认推荐问题列表', { count: questions.length });
  }
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
    const prompt = `将以下内容转化为更专业、简洁且结构清晰的格式，适合参考。
    请生成一个简短的标题（不超过15个字,），然后是处理后的内容，内容需要通过表情润色。
    格式要求：
    标题：[标题文本]
    内容：[处理后的内容]
    
    原始内容：${content}`;

    // 调用deepseek-v3模型
    const model = wx.cloud.extend.AI.createModel("deepseek");
    const res = await model.generateText({
      model: "deepseek-v3",
      messages: [{ role: "user", content: prompt }],
    });

    // 解析结果，提取标题和内容
    const result = res.choices[0].message.content;

    let title = '收藏内容';
    let processedContent = content; // 默认使用原始内容

    // 尝试提取标题（方法1：使用"标题："和"内容："标记）
    const titleMatch = result.match(/标题：(.*?)[\n\r]/);
    const contentMatch = result.match(/内容：([\s\S]*)/);

    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim();
      Logger.info('成功提取标题（方法1）', title);
    } else {
      // 方法2：使用第一行作为标题
      const lines = result.split('\n');
      if (lines.length > 0 && lines[0].length < 50) {
        title = lines[0].trim();
        processedContent = lines.slice(1).join('\n').trim();
        Logger.info('成功提取标题（方法2）', title);
      }
    }

    // 如果找到了内容匹配，使用匹配的内容
    if (contentMatch && contentMatch[1]) {
      processedContent = contentMatch[1].trim();
    }

    // 确保标题不为空
    if (!title || title.length === 0) {
      title = '收藏内容';
    }

    Logger.info('内容专业化处理完成', { title, titleLength: title.length });

    return {
      title: title,
      content: processedContent
    };
  } catch (error) {
    Logger.error('内容专业化处理失败', error);
    // 出错时返回默认值，而不是抛出错误
    return {
      title: '收藏内容',
      content: content
    };
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

/**
 * 根据用户健康档案生成个性化的推荐问题
 * @param {Object} healthRecords - 用户健康档案
 * @param {Object} additionalInfo - 额外信息，如节气等
 * @param {Number} questionCount - 需要生成的问题数量，默认为5
 * @returns {Promise<boolean>} 是否成功更新
 */
async function generatePersonalizedQuestions(healthRecords, additionalInfo = {}, questionCount = 5) {
  try {
    if (!healthRecords) {
      Logger.info('没有健康档案，不更新推荐问题');
      return false;
    }
    
    // 构建上下文信息
    const contextInfo = {
      isLoggedIn: true,
      hasPersonalInfo: true,
      healthRecords,
      solarTermInfo: additionalInfo.solarTermInfo
    };
    
    // 使用generateRecommendedQuestions生成个性化问题
    const personalizedQuestions = await generateRecommendedQuestions([], contextInfo, questionCount);
    
    // 如果成功生成了问题，更新generalQuestions
    if (personalizedQuestions && personalizedQuestions.length >= 3) {
      // 保留一些通用问题，与个性化问题混合
      const currentGeneralQuestions = generalQuestions.slice(0, Math.min(2, generalQuestions.length));
      const newQuestions = [...personalizedQuestions, ...currentGeneralQuestions];
      
      // 更新generalQuestions
      updateGeneralQuestions(newQuestions);
      return true;
    }
    
    return false;
  } catch (error) {
    Logger.error('生成个性化推荐问题失败', error);
    return false;
  }
}

export default {
  MODEL_CONFIG,
  MODEL_OPTIONS,
  generateAIResponse,
  generateRecommendedQuestions,
  getDefaultRecommendedQuestions,
  buildSystemPrompt,
  professionalizeContent,
  stopGeneration,
  generatePersonalizedQuestions,
  updateGeneralQuestions
}; 