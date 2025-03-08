const app = getApp()
import Logger from '../../utils/logger'
import { buildSystemPrompt } from '../../utils/systemPrompt'

// 模型配置
const MODEL_CONFIG = {
  // DeepSeek模型
  'DeepSeek-v3': {
    id: 'DeepSeek-v3',
    name: 'DeepSeek-v3',
    apiModel: 'deepseek-v3',
    description: 'DeepSeek基础大模型'
  },
  'DeepSeek-r1': {
    id: 'DeepSeek-r1',
    name: 'DeepSeek-r1',
    apiModel: 'deepseek-r1',
    description: 'DeepSeek增强版大模型'
  }
};

Page({
  data: {
    // 存储聊天消息的数组，每条消息可以是一个对象，包含消息内容、发送者等信息
    messages: [], 
    // 输入框的当前值，用于存储用户输入的消息
    inputValue: '', 
    // 消息列表的滚动位置，用于控制页面滚动到指定位置
    scrollTop: 0, 
    // 用户的健康记录，初始为 null，后续可能从服务器获取
    healthRecords: null, 
    // 是否正在加载 AI 回复的标志，用于显示加载状态
    isLoading: false, 
    // 要滚动到的消息的标识，用于定位到特定消息
    scrollToMessage: '', 
    // 推荐问题列表，显示在页面上供用户快速选择提问
    recommendedQuestions: [
      '健康饮食有什么建议？',
      '如何保持良好的作息？',
      '日常应该注意什么？'
    ],
    // 用户登录状态
    isLoggedIn: false,
    // 是否已完善个人信息
    hasPersonalInfo: false,
    // 天气信息
    weatherInfo: {
      icon: '',
      description: '',
      temperature: ''
    },
    // 节气信息
    solarTermInfo: '',
    // 当前使用的模型类型
    currentModel: 'DeepSeek-v3',
    // 当前模型的显示名称
    currentModelName: 'DeepSeek-v3',
    // 是否显示模型选择器
    showModelSelector: false,
    // 可用的模型类型列表
    modelOptions: Object.values(MODEL_CONFIG)
  },

  onLoad() {
    // 记录页面加载
    Logger.info('聊天页面加载')
    
    // 初始化当前模型名称
    this.initCurrentModelName()
    
    // 检查用户登录状态
    this.checkLoginStatus()
    
    // 获取天气和节气信息
    this.getWeatherInfo()
    this.getSolarTermInfo()
    
    // 检查当前选择的模型是否有效
    this.validateCurrentModel()
    
    // 从本地存储中恢复上次使用的模型（如果有）
    this.restoreLastUsedModel()
  },
  
  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
    
    // 获取天气和节气信息
    this.getWeatherInfo()
    this.getSolarTermInfo()
  },
  
  // 初始化当前模型名称
  initCurrentModelName() {
    try {
      const { currentModel, modelOptions } = this.data
      if (modelOptions && modelOptions.length > 0) {
        const modelConfig = modelOptions.find(option => option.id === currentModel)
        if (modelConfig) {
          this.setData({ currentModelName: modelConfig.name })
        }
      }
    } catch (error) {
      Logger.error('初始化当前模型名称时出错:', error)
    }
  },
  
  // 检查用户登录状态和个人信息
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    const hasPersonalInfo = app.globalData.hasPersonalInfo
    
    this.setData({
      isLoggedIn: isLoggedIn,
      hasPersonalInfo: hasPersonalInfo
    })
    
    // 如果用户已登录且已完善个人信息，加载健康记录
    if (isLoggedIn && hasPersonalInfo) {
      this.loadHealthRecords()
    } else {
      // 未登录或未完善个人信息时，清空健康记录
      this.setData({
        healthRecords: null
      })
    }
  },
  
  // 加载健康记录
  loadHealthRecords() {
    if (app.globalData.healthRecords) {
      this.setData({
        healthRecords: app.globalData.healthRecords
      })
      Logger.debug('健康记录加载成功', app.globalData.healthRecords)
    } else {
      Logger.warn('未找到健康记录数据')
    }
  },

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  onRecommendedQuestion(e) {
    const question = e.currentTarget.dataset.question
    this.setData({
      inputValue: question
    }, () => {
      this.sendMessage()
    })
  },

  // 发送消息
  sendMessage() {
    const { inputValue } = this.data
    if (!inputValue.trim()) return
    
    // 添加用户消息
    const userMessageId = this.data.messages.length + 1
    const userMessage = {
      id: userMessageId,
      type: 'user',
      content: inputValue
    }
    
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isLoading: true
    }, () => {
      // 滚动到底部
      this.scrollToBottom()
      
      // 生成AI回复
      this.generateAIResponse(inputValue)
    })
  },

  // 生成AI回复
  async generateAIResponse(userQuery) {
    try {
      // 初始化AI回复消息
      const aiMessageId = this.data.messages.length + 1
      const initialAiMessage = {
        id: aiMessageId,
        type: 'system',
        content: '',
        formattedContent: ''
      }
      
      this.setData({
        messages: [...this.data.messages, initialAiMessage],
        isLoading: true
      }, () => {
        // 滚动到底部
        this.scrollToBottom()
      })
      
      // 构建系统提示词
      const systemPrompt = buildSystemPrompt({
        isLoggedIn: this.data.isLoggedIn,
        hasPersonalInfo: this.data.hasPersonalInfo,
        healthRecords: this.data.healthRecords,
        weatherInfo: this.data.weatherInfo,
        solarTermInfo: this.data.solarTermInfo
      })
      
      // 构建消息历史
      const messageHistory = this.data.messages
        .filter(msg => msg.id !== aiMessageId) // 排除刚刚添加的空消息
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
      
      // 添加系统提示词
      messageHistory.unshift({
        role: 'system',
        content: systemPrompt
      })
      
      // 获取当前选择的模型配置
      const modelConfig = MODEL_CONFIG[this.data.currentModel];
      
      if (!modelConfig) {
        // 如果找不到当前模型配置，使用第一个可用的模型
        if (this.data.modelOptions.length > 0) {
          const defaultModel = this.data.modelOptions[0];
          Logger.warn(`未找到模型配置: ${this.data.currentModel}，使用默认模型: ${defaultModel.id}`);
          this.setData({ 
            currentModel: defaultModel.id,
            currentModelName: defaultModel.name
          });
          modelConfig = MODEL_CONFIG[defaultModel.id];
        } else {
          throw new Error(`未找到模型配置，且模型选项列表为空`);
        }
      }
      
      // 调用AI模型生成回复
      try {
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
        })
        
        // 处理DeepSeek模型的eventStream响应
        for await (let event of res.eventStream) {
          if (event.data === '[DONE]') break

          const data = JSON.parse(event.data)
          const text = data?.choices?.[0]?.delta?.content

          if (text) {
            // 更新消息内容
            this.updateMessageContent(text)
          }
        }
        
        // 响应完成后
        this.setData({
          isLoading: false
        }, () => {
          // 滚动到底部
          this.scrollToBottom()
        })
      } catch (error) {
        // 处理错误
        Logger.error('生成AI回复时出错:', error)
        
        // 更新错误消息
        const errorMessage = '抱歉，生成回复时出现了错误，请稍后再试。'
        const updatedMessages = [...this.data.messages]
        
        if (updatedMessages.length > 0) {
          updatedMessages[updatedMessages.length - 1].content = errorMessage
        }
        
        this.setData({
          messages: updatedMessages,
          isLoading: false
        })
        
        // 显示错误提示
        wx.showToast({
          title: '生成回复失败',
          icon: 'none',
          duration: 2000
        })
      }
    } catch (error) {
      this.setData({
        isLoading: false
      })
    }
  },

  // 更新消息内容并滚动到底部
  updateMessageContent(text) {
    const updatedMessages = [...this.data.messages]
    updatedMessages[updatedMessages.length - 1].content += text

    this.setData({
      messages: updatedMessages
    }, () => {
      // 每次更新内容后滚动到底部
      this.scrollToBottom()
    })
  },

  // 简单Markdown格式化
  formatMarkdown(text) {
    if (!text) return '';
    
    try {
      // 创建一个格式化规则数组，一次性应用所有规则
      const formatRules = [
        // 处理标题 (h1-h6)
        {
          regex: /^(#{1,6})\s+(.*)$/gm,
          replacement: (match, hashes, content) => {
            const hLevel = hashes.length;
            const fontSize = 28 - (hLevel - 1) * 2;
            return `<div style="font-size:${fontSize}px;font-weight:bold;margin:8px 0;">${content}</div>`;
          }
        },
        // 处理加粗
        {
          regex: /\*\*(.*?)\*\*/g,
          replacement: '<b>$1</b>'
        },
        // 处理斜体
        {
          regex: /\*(.*?)\*/g,
          replacement: '<i>$1</i>'
        },
        // 处理无序列表
        {
          regex: /^\s*-\s+(.*)$/gm,
          replacement: '<div style="margin-left:16px;">• $1</div>'
        },
        // 处理有序列表
        {
          regex: /^\s*(\d+)\.\s+(.*)$/gm,
          replacement: '<div style="margin-left:16px;">$1. $2</div>'
        },
        // 处理代码块
        {
          regex: /```([\s\S]*?)```/g,
          replacement: '<div style="background-color:#f5f5f5;padding:8px;border-radius:4px;font-family:monospace;white-space:pre-wrap;margin:8px 0;font-size:12px;">$1</div>'
        },
        // 处理行内代码
        {
          regex: /`([^`]+)`/g,
          replacement: '<span style="background-color:#f5f5f5;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:12px;">$1</span>'
        },
        // 处理水平线
        {
          regex: /^---+$/gm,
          replacement: '<div style="border-top:1px solid #eee;margin:8px 0;"></div>'
        },
        // 处理链接
        {
          regex: /\[([^\]]+)\]\(([^)]+)\)/g,
          replacement: '<a style="color:#0366d6;" href="$2">$1</a>'
        },
        // 处理段落
        {
          regex: /\n\n/g,
          replacement: '<div style="margin:8px 0;"></div>'
        },
        // 处理换行
        {
          regex: /\n/g,
          replacement: '<br>'
        }
      ];
      
      // 一次性应用所有规则
      return formatRules.reduce((formattedText, rule) => {
        return formattedText.replace(rule.regex, rule.replacement);
      }, text);
      
    } catch (error) {
      // 使用Logger替代console.error
      Logger.error('Markdown格式化错误:', error);
      // 如果格式化失败，返回纯文本
      return text.replace(/\n/g, '<br>');
    }
  },

  // 延时函数
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('#message-container')
        .node()
        .exec(res => {
          if (res && res[0] && res[0].node) {
            const scrollView = res[0].node;
            scrollView.scrollIntoView({
              selector: '.message-item:last-child',
              animated: true
            });
          } else {
            // 兼容旧方法
            wx.createSelectorQuery()
              .select('#message-container')
              .boundingClientRect(rect => {
                if (rect) {
                  this.setData({
                    scrollTop: 100000 // 使用一个足够大的值确保滚动到底部
                  });
                }
              })
              .exec();
          }
        });
    }, 100);
  },

  // 清空聊天记录
  clearChat() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有聊天记录吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            messages: []
          })
          Logger.info('用户清空了聊天记录')
        }
      }
    })
  },

  // 获取天气信息（模拟数据，实际应用中应该调用天气API）
  getWeatherInfo() {
    // 模拟天气数据
    const weatherTypes = [
      { icon: '/images/weather/sunny.png', description: '晴朗', temperature: '25' },
      { icon: '/images/weather/cloudy.png', description: '多云', temperature: '22' },
      { icon: '/images/weather/rainy.png', description: '小雨', temperature: '18' },
      { icon: '/images/weather/snowy.png', description: '小雪', temperature: '0' },
      { icon: '/images/weather/windy.png', description: '有风', temperature: '20' }
    ]
    
    // 随机选择一种天气（实际应用中应该根据用户位置获取真实天气）
    const randomIndex = Math.floor(Math.random() * weatherTypes.length)
    const weather = weatherTypes[randomIndex]
    
    this.setData({
      weatherInfo: weather
    })
    
    // 注意：实际应用中，应该获取用户位置，然后调用天气API获取真实天气数据
    // wx.getLocation({
    //   success: (res) => {
    //     // 调用天气API获取天气数据
    //   }
    // })
  },
  
  // 获取节气信息
  getSolarTermInfo() {
    // 获取当前日期
    const now = new Date()
    const month = now.getMonth() + 1
    const day = now.getDate()
    
    // 使用数据驱动方式定义节气
    const solarTerms = [
      { name: '立春', startMonth: 2, startDay: 1, endMonth: 2, endDay: 18 },
      { name: '雨水', startMonth: 2, startDay: 19, endMonth: 3, endDay: 4 },
      { name: '惊蛰', startMonth: 3, startDay: 5, endMonth: 3, endDay: 20 },
      { name: '春分', startMonth: 3, startDay: 21, endMonth: 4, endDay: 4 },
      { name: '清明', startMonth: 4, startDay: 5, endMonth: 4, endDay: 19 },
      { name: '谷雨', startMonth: 4, startDay: 20, endMonth: 5, endDay: 5 },
      { name: '立夏', startMonth: 5, startDay: 6, endMonth: 5, endDay: 20 },
      { name: '小满', startMonth: 5, startDay: 21, endMonth: 6, endDay: 5 },
      { name: '芒种', startMonth: 6, startDay: 6, endMonth: 6, endDay: 21 },
      { name: '夏至', startMonth: 6, startDay: 22, endMonth: 7, endDay: 6 },
      { name: '小暑', startMonth: 7, startDay: 7, endMonth: 7, endDay: 22 },
      { name: '大暑', startMonth: 7, startDay: 23, endMonth: 8, endDay: 7 },
      { name: '立秋', startMonth: 8, startDay: 8, endMonth: 8, endDay: 23 },
      { name: '处暑', startMonth: 8, startDay: 24, endMonth: 9, endDay: 7 },
      { name: '白露', startMonth: 9, startDay: 8, endMonth: 9, endDay: 23 },
      { name: '秋分', startMonth: 9, startDay: 24, endMonth: 10, endDay: 8 },
      { name: '寒露', startMonth: 10, startDay: 9, endMonth: 10, endDay: 23 },
      { name: '霜降', startMonth: 10, startDay: 24, endMonth: 11, endDay: 7 },
      { name: '立冬', startMonth: 11, startDay: 8, endMonth: 11, endDay: 22 },
      { name: '小雪', startMonth: 11, startDay: 23, endMonth: 12, endDay: 6 },
      { name: '大雪', startMonth: 12, startDay: 7, endMonth: 12, endDay: 21 },
      { name: '冬至', startMonth: 12, startDay: 22, endMonth: 1, endDay: 5 },
      { name: '小寒', startMonth: 1, startDay: 6, endMonth: 1, endDay: 20 },
      { name: '大寒', startMonth: 1, startDay: 21, endMonth: 2, endDay: 3 }
    ]
    
    // 查找当前日期所属的节气
    let currentSolarTerm = '未知'
    
    for (const term of solarTerms) {
      if (
        // 在同一个月内
        (month === term.startMonth && day >= term.startDay && month === term.endMonth && day <= term.endDay) ||
        // 跨月，当前月是起始月
        (month === term.startMonth && day >= term.startDay && month !== term.endMonth) ||
        // 跨月，当前月是结束月
        (month === term.endMonth && day <= term.endDay && month !== term.startMonth) ||
        // 跨年特殊情况（冬至）
        (term.name === '冬至' && ((month === 12 && day >= 22) || (month === 1 && day <= 5)))
      ) {
        currentSolarTerm = term.name
        break
      }
    }
    
    // 如果没有找到匹配的节气，使用默认值
    if (currentSolarTerm === '未知') {
      Logger.warn('未能确定当前节气，使用默认值')
      currentSolarTerm = '节气未知'
    }
    
    this.setData({
      solarTermInfo: currentSolarTerm
    })
    
    Logger.info(`当前节气: ${currentSolarTerm}`)
  },
  
  // 切换模型选择器的显示状态
  toggleModelSelector() {
    this.setData({
      showModelSelector: !this.data.showModelSelector
    });
  },
  
  // 选择模型
  selectModel(e) {
    const modelId = e.currentTarget.dataset.model;
    this.switchModel(modelId);
    this.setData({
      showModelSelector: false
    });
  },
  
  // 切换模型类型
  switchModel(modelId) {
    // 检查提供的模型类型是否有效
    const modelConfig = MODEL_CONFIG[modelId];
    
    if (modelConfig) {
      this.setData({
        currentModel: modelId,
        currentModelName: modelConfig.name
      });
      
      // 保存用户选择的模型到本地存储
      try {
        wx.setStorageSync('lastUsedModel', modelId);
      } catch (error) {
        Logger.error('保存模型选择时出错:', error);
      }
      
      // 显示切换成功的提示
      wx.showToast({
        title: `已切换至 ${modelConfig.name}`,
        icon: 'none',
        duration: 1500
      });
      
      // 记录模型切换日志
      Logger.info(`模型已切换至 ${modelConfig.name} (${modelConfig.apiModel})`);
    } else {
      // 显示错误提示
      wx.showToast({
        title: '无效的模型类型',
        icon: 'error',
        duration: 1500
      });
      
      Logger.error(`尝试切换至无效的模型类型: ${modelId}`);
    }
  },

  // 验证当前选择的模型是否有效
  validateCurrentModel() {
    try {
      const { currentModel } = this.data
      
      // 检查当前模型是否存在于配置中
      const modelConfig = MODEL_CONFIG[currentModel]
      
      if (!modelConfig) {
        // 如果当前模型不存在于配置中，则切换到第一个可用的模型
        const modelIds = Object.keys(MODEL_CONFIG)
        if (modelIds.length > 0) {
          const defaultModelId = modelIds[0]
          const defaultModel = MODEL_CONFIG[defaultModelId]
          this.setData({ 
            currentModel: defaultModelId,
            currentModelName: defaultModel.name
          })
          Logger.info(`当前模型无效，已切换至默认模型: ${defaultModelId}`)
        } else {
          Logger.error('模型配置为空')
        }
      } else {
        // 确保currentModelName与当前模型匹配
        if (this.data.currentModelName !== modelConfig.name) {
          this.setData({ currentModelName: modelConfig.name })
        }
        Logger.info(`当前使用模型: ${currentModel} (${modelConfig.name})`)
      }
    } catch (error) {
      Logger.error('验证模型时出错:', error)
    }
  },

  // 关闭模型选择器
  closeModelSelector() {
    if (this.data.showModelSelector) {
      this.setData({
        showModelSelector: false
      });
    }
  },
  
  // 阻止事件冒泡
  stopPropagation() {
    // 仅用于阻止事件冒泡，不需要实际操作
    return;
  },

  // 从本地存储中恢复上次使用的模型
  restoreLastUsedModel() {
    try {
      const lastUsedModel = wx.getStorageSync('lastUsedModel')
      if (lastUsedModel && MODEL_CONFIG[lastUsedModel]) {
        const modelConfig = MODEL_CONFIG[lastUsedModel]
        this.setData({ 
          currentModel: lastUsedModel,
          currentModelName: modelConfig.name
        })
        Logger.info(`已恢复上次使用的模型: ${lastUsedModel} (${modelConfig.name})`)
      }
    } catch (error) {
      Logger.error('恢复上次使用的模型时出错:', error)
    }
  },
}) 