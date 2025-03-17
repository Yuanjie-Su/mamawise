/**
 * AI服务
 * 负责处理与AI模型交互的相关功能
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'

// 从 appConfig 中获取需要的配置
const { DEFAULT_AI_CONFIG, MODEL_CONFIG } = appConfig

// 控制生成状态的标志
let isGenerationStopped = false

/**
 * 生成AI回复
 * @param {Array} messages - 消息历史
 * @param {String} userQuery - 用户问题
 * @param {Function} onProgress - 流式响应的回调函数
 * @returns {Promise} 返回生成结果的Promise
 */
async function generateAIResponse(messages, userQuery, prompt, model_name, onProgress) {
  return new Promise(async (resolve, reject) => {
    try {
      // 重置停止标志
      isGenerationStopped = false

      // 用于跟踪是否已接收到第一段内容
      let hasReceivedFirstContent = false

      // 构建消息历史
      const messageHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
      }))

      if (!prompt) {
        prompt = DEFAULT_AI_CONFIG.PROMPT
      }

      // 添加系统提示词
      messageHistory.unshift({
        role: 'system',
        content: prompt,
      })

      // 获取当前选择的模型配置
      const modelConfig = MODEL_CONFIG[model_name]

      if (!modelConfig) {
        throw new Error(`未找到模型配置: ${model_name}`)
      }

      // 创建模型实例
      const model = wx.cloud.extend.AI.createModel('deepseek')

      // 使用流式响应
      const res = await model.streamText({
        data: {
          model: modelConfig.api,
          messages: [
            ...messageHistory,
            {
              role: 'user',
              content: userQuery,
            },
          ],
        },
      })

      // 处理eventStream响应
      for await (let event of res.eventStream) {
        // 如果生成已被停止，中断循环
        if (isGenerationStopped) {
          Logger.info('AI回复生成已被用户终止')
          break
        }

        if (event.data === '[DONE]') break

        const data = JSON.parse(event.data)
        const text = data?.choices?.[0]?.delta?.content

        if (text && onProgress) {
          // 去除开头的空白行
          let processedText = text
          if (!hasReceivedFirstContent) {
            processedText = text.replace(/^\n+/, '')
            hasReceivedFirstContent = true
          }

          onProgress(processedText)
        }
      }

      resolve(true)
    } catch (error) {
      // 如果是因为用户终止而导致的错误，不需要抛出
      if (isGenerationStopped) {
        Logger.info('AI回复生成已被用户终止')
        resolve(true)
        return
      }

      Logger.error('生成AI回复时出错:', error)
      reject(error)
    }
  })
}

/**
 * 生成推荐问题
 * @param {Array} messages - 消息历史
 * @param {Object} contextInfo - 上下文信息，包含用户健康记录等
 * @param {Number} questionCount - 需要生成的问题数量，默认为3
 * @returns {Promise<Array>} 返回推荐问题数组的Promise
 */
async function generateRecommendedQuestions(query, questionCount = 3) {
  try {
    // 系统提示词
    const systemPrompt = `生成${questionCount}个与用户提问最相关的问题。
        只返回问题，每行一个，不要有编号或其他格式。\n\n`

    // 创建模型实例
    const model = wx.cloud.extend.AI.createModel('deepseek')

    // 使用生成文本
    const res = await model.generateText({
      model: 'deepseek-v3',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
    })

    const generatedText = res.choices[0].message.content

    if (generatedText) {
      // 处理返回的文本，分割成问题列表
      const questions = generatedText.split('\n').filter(q => q.trim().length > 0)

      // 如果生成的问题数量不足，从默认问题中补充
      if (questions.length < questionCount) {
        Logger.info('生成的问题数量不足，从默认问题中补充')
        const defaultQuestions = getDefaultQuestions()
        const additionalQuestions = getRandomItems(
          defaultQuestions.filter(q => !questions.includes(q)),
          questionCount - questions.length
        )
        return [...questions, ...additionalQuestions]
      }

      // 如果生成的问题数量超过需要的数量，只返回需要的数量
      return questions.slice(0, questionCount)
    } else {
      Logger.info('模型API调用失败，使用默认问题')
      // 如果API调用失败，使用默认问题
      return getDefaultRecommendedQuestions()
    }
  } catch (error) {
    Logger.error('生成推荐问题失败', error)
    // 出错时使用默认问题
    return getDefaultRecommendedQuestions()
  }
}

/**
 * 获取默认推荐问题
 * @returns {Array} 返回推荐问题数组
 */
function getDefaultRecommendedQuestions() {
  return getRandomItems(DEFAULT_AI_CONFIG.RECOMMENDED_QUESTIONS, 3)
}

/**
 * 从数组中随机获取指定数量的元素
 * @param {Array} array - 源数组
 * @param {Number} count - 需要获取的元素数量
 * @returns {Array} 随机选取的元素数组
 */
function getRandomItems(array, count) {
  const shuffled = array.slice()
  let i = array.length
  let temp, index

  // Fisher-Yates 洗牌算法
  while (i--) {
    index = Math.floor((i + 1) * Math.random())
    temp = shuffled[index]
    shuffled[index] = shuffled[i]
    shuffled[i] = temp
  }

  return shuffled.slice(0, count)
}

/**
 * 将内容专业化处理
 * @param {String} content - 原始内容
 * @returns {Object} 处理后的结果，包含标题和内容
 */
async function professionalizeContent(content) {
  try {
    Logger.info('开始专业化处理内容')

    // 构建提示词
    const prompt = `将以下内容转化为更专业、简洁且结构清晰的格式，适合参考。
    请生成一个简短的标题（不超过15个字,），然后是处理后的内容，内容需要通过表情润色。
    格式要求：
    标题：[标题文本]
    内容：[处理后的内容]
    
    原始内容：${content}`

    // 创建模型实例
    const model = wx.cloud.extend.AI.createModel('deepseek')

    // 调用deepseek-v3模型
    const res = await model.generateText({
      model: 'deepseek-v3',
      messages: [{ role: 'user', content: prompt }],
    })

    // 解析结果，提取标题和内容
    const result = res.choices[0].message.content

    let title = '收藏内容'
    let processedContent = content // 默认使用原始内容

    // 尝试提取标题（方法1：使用"标题："和"内容："标记）
    const titleMatch = result.match(/标题：(.*?)[\n\r]/)
    const contentMatch = result.match(/内容：([\s\S]*)/)

    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1].trim()
      Logger.info('成功提取标题（方法1）', title)
    } else {
      // 方法2：使用第一行作为标题
      const lines = result.split('\n')
      if (lines.length > 0 && lines[0].length < 50) {
        title = lines[0].trim()
        processedContent = lines.slice(1).join('\n').trim()
        Logger.info('成功提取标题（方法2）', title)
      }
    }

    // 如果找到了内容匹配，使用匹配的内容
    if (contentMatch && contentMatch[1]) {
      processedContent = contentMatch[1].trim()
    }

    // 确保标题不为空
    if (!title || title.length === 0) {
      title = '收藏内容'
    }

    Logger.info('内容专业化处理完成', { title, titleLength: title.length })

    return {
      title: title,
      content: processedContent,
    }
  } catch (error) {
    Logger.error('内容专业化处理失败', error)
    // 出错时返回默认值，而不是抛出错误
    return {
      title: '收藏内容',
      content: content,
    }
  }
}

/**
 * 停止AI回复生成
 */
function stopGeneration() {
  // 设置停止标志
  isGenerationStopped = true
  Logger.info('已设置AI回复生成停止标志')
}

// 导出函数
export default {
  generateAIResponse,
  generateRecommendedQuestions,
  getDefaultRecommendedQuestions,
  professionalizeContent,
  stopGeneration,
}
