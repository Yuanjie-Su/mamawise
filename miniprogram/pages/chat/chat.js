import appState from '../../models/appState'
import Logger from '../../utils/logger'
import aiService from '../../services/aiService'
import weatherService from '../../services/weatherService'
import userService from '../../services/userService'
import chatService from '../../services/chatService'
import messageModel from '../../models/messageModel'
import appConfig from '../../config/appConfig'

const { STORAGE_KEYS } = appConfig
const { MODEL_CONFIG, MODEL_OPTIONS } = aiService

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
    // 推荐问题列表，显示在页面上供用户快速选择提问，每次随机生成3个符合语境的问题
    recommendedQuestions: [],
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
    currentModel: 'DeepSeek-r1',
    // 当前模型的显示名称
    currentModelName: 'DeepSeek-r1',
    // 是否显示模型选择器
    showModelSelector: false,
    // 可用的模型类型列表
    modelOptions: MODEL_OPTIONS,
    // 页面状态
    showLoginModal: false
  },

  onLoad() {
    Logger.debug('聊天页面加载')
    
    // 初始化当前模型名称
    this.initCurrentModelName()
    
    // 检查当前选择的模型是否有效
    this.validateCurrentModel()
    
    // 从本地存储中恢复上次使用的模型（如果有）
    this.restoreLastUsedModel()
    
    // 检查登录状态
    this.checkLoginStatus()
    
    // 加载聊天记录
    this.loadChatHistory()
    
    // 获取天气和节气信息
    this.updateWeatherAndSolarTerm()
    
    // 订阅用户登录状态变更
    this.unsubscribeLogin = appState.subscribe('user.isLoggedIn', (isLoggedIn) => {
      this.setData({ isLoggedIn })
      
      // 如果用户已登录，获取用户信息
      if (isLoggedIn) {
        const userInfo = appState.get('user.userInfo')
        this.setData({ userInfo })
      } else {
        this.setData({ showLoginModal: true })
      }
    })
    
    // 订阅环境信息变更
    this.unsubscribeWeather = appState.subscribe('environment.weatherInfo', (weatherInfo) => {
      this.setData({ weatherInfo })
    })
    
    this.unsubscribeSolarTerm = appState.subscribe('environment.solarTermInfo', (solarTermInfo) => {
      this.setData({ solarTermInfo })
    })
  },
  
  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
    
    // 获取天气和节气信息
    this.updateWeatherAndSolarTerm()
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
  async checkLoginStatus() {
    try {
      const { isLoggedIn, hasPersonalInfo } = await userService.checkLoginStatus()
      
      this.setData({
        isLoggedIn,
        hasPersonalInfo
      })
      
      if (isLoggedIn) {
        // 加载健康记录
        this.loadHealthRecords()
      } else {
        // 未登录或未完善个人信息时，清空健康记录
        this.setData({
          healthRecords: null
        })
      }
    } catch (error) {
      Logger.error('检查登录状态失败', error)
    }
  },
  
  // 加载健康记录
  async loadHealthRecords() {
    try {
      if (this.data.isLoggedIn) {
        const healthRecords = await userService.getHealthRecords()
        this.setData({
          healthRecords
        })
        Logger.debug('健康记录加载成功', healthRecords)
      } else {
        Logger.warn('未找到健康记录数据')
      }
    } catch (error) {
      Logger.error('加载健康记录失败', error)
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
  sendMessage: function() {
    const { inputValue, messages, isLoading } = this.data;
    
    // 如果正在加载或输入为空，则不发送
    if (isLoading || !inputValue.trim()) {
      return;
    }
    
    // 添加用户消息
    const userMessage = {
      type: 'user',
      content: inputValue,
      time: new Date().toLocaleTimeString()
    };
    
    const newMessages = [...messages, userMessage];
    
    this.setData({
      messages: newMessages,
      inputValue: '',
      isLoading: true
    });
    
    // 滚动到底部
    this.scrollToBottom();
    
    // 调用AI回复
    this.getAIResponse(inputValue, newMessages);
  },
  
  // 获取AI回复
  getAIResponse: function(userInput, messageHistory) {
    // 获取当前AI模型
    const currentModel = appState.get('ai.currentModel');
    
    // 构建请求参数
    const params = {
      model: currentModel,
      messages: this.formatMessagesForAPI(messageHistory),
      userInfo: appState.get('user.userInfo'),
      weatherInfo: appState.get('environment.weatherInfo'),
      solarTermInfo: appState.get('environment.solarTermInfo')
    };
    
    // 调用云函数
    wx.cloud.callFunction({
      name: 'generateText',
      data: params,
      success: res => {
        // 处理成功响应
        this.handleAIResponse(res.result);
      },
      fail: err => {
        // 处理错误
        Logger.error('AI回复失败', err);
        this.handleAIError();
      }
    });
  },

  // 生成AI回复
  async generateAIResponse(userQuery) {
    try {
      // 初始化AI回复消息
      const aiMessageId = this.data.messages.length + 1
      const initialAiMessage = messageModel.createEmptySystemMessage(aiMessageId)
      
      this.setData({
        messages: [...this.data.messages, initialAiMessage],
        isLoading: true
      }, () => {
        // 滚动到底部
        this.scrollToBottom()
      })
      
      // 准备上下文信息
      const contextInfo = {
        isLoggedIn: this.data.isLoggedIn,
        hasPersonalInfo: this.data.hasPersonalInfo,
        healthRecords: this.data.healthRecords,
        weatherInfo: this.data.weatherInfo,
        solarTermInfo: this.data.solarTermInfo,
        currentModel: this.data.currentModel
      }
      
      // 调用AI服务生成回复
      await aiService.generateAIResponse(
        this.data.messages.filter(msg => msg.id !== aiMessageId), // 排除刚刚添加的空消息
        userQuery,
        contextInfo,
        (text) => this.updateMessageContent(text) // 流式响应回调
      )
      
      // 先生成新的推荐问题
      const recommendedQuestions = await aiService.generateRecommendedQuestions(this.data.messages)
      this.setData({ recommendedQuestions })
      
      // 然后再设置isLoading为false并滚动到底部
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
  },

  // 更新消息内容
  updateMessageContent(text) {
    const updatedMessages = [...this.data.messages]
    const lastMessage = updatedMessages[updatedMessages.length - 1]
    
    if (lastMessage) {
      lastMessage.content += text
      
      this.setData({
        messages: updatedMessages
      })
      
      // 保存聊天记录
      chatService.saveChatHistory(updatedMessages)
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
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      success: (res) => {
        if (res.confirm) {
          chatService.clearChatHistory().then(() => {
            this.setData({
              messages: []
            })
            
            // 生成新的推荐问题
            aiService.generateRecommendedQuestions([]).then(questions => {
              this.setData({
                recommendedQuestions: questions
              });
            });
          })
        }
      }
    })
  },

  // 更新天气和节气信息
  updateWeatherAndSolarTerm() {
    // 获取天气信息
    weatherService.getWeatherInfo()
      .then(weatherInfo => {
        // 更新状态
        appState.set('environment.weatherInfo', weatherInfo);
      })
      .catch(error => {
        Logger.error('获取天气信息失败', error);
      });
    
    // 获取节气信息
    weatherService.getSolarTermInfo()
      .then(solarTermInfo => {
        // 更新状态
        appState.set('environment.solarTermInfo', solarTermInfo);
      })
      .catch(error => {
        Logger.error('获取节气信息失败', error);
      });
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

  // 清空输入框内容
  clearInput() {
    this.setData({
      inputValue: ''
    });
    Logger.debug('用户清空了输入框');
  },

  // 加载聊天记录
  async loadChatHistory() {
    try {
      const messages = await chatService.getChatHistory()
      this.setData({ messages })
    } catch (error) {
      Logger.error('加载聊天记录失败', error)
    }
  },

  // 页面卸载时
  onUnload: function() {
    // 取消状态订阅
    if (this.unsubscribeLogin) this.unsubscribeLogin()
    if (this.unsubscribeWeather) this.unsubscribeWeather()
    if (this.unsubscribeSolarTerm) this.unsubscribeSolarTerm()
    
    Logger.info('聊天页面卸载')
  },

  // 生成推荐问题
  generateRecommendedQuestions: function() {
    const { messages } = this.data;
    
    // 如果没有消息历史，使用默认推荐问题
    if (messages.length === 0) {
      this.useDefaultRecommendedQuestions();
      return;
    }
    
    // 获取当前AI模型
    const currentModel = appState.get('ai.currentModel');
    
    // 构建请求参数
    const params = {
      model: currentModel,
      messages: this.formatMessagesForAPI(messages),
      task: 'generate_questions',
      userInfo: appState.get('user.userInfo'),
      weatherInfo: appState.get('environment.weatherInfo'),
      solarTermInfo: appState.get('environment.solarTermInfo')
    };
    
    // 调用云函数
    wx.cloud.callFunction({
      name: 'generateText',
      data: params,
      success: res => {
        // 处理成功响应
        if (res.result && res.result.questions && Array.isArray(res.result.questions)) {
          // 确保只有3个问题
          const questions = res.result.questions.slice(0, 3);
          
          this.setData({
            recommendedQuestions: questions
          });
        } else {
          this.useDefaultRecommendedQuestions();
        }
      },
      fail: err => {
        // 处理错误
        Logger.error('生成推荐问题失败', err);
        this.useDefaultRecommendedQuestions();
      }
    });
  },

  // 使用默认推荐问题
  useDefaultRecommendedQuestions: function() {
    const defaultQuestions = [
      '怀孕期间如何保持健康饮食？',
      '孕期有哪些常见不适症状？',
      '胎儿发育的关键阶段有哪些？',
      '孕期需要补充哪些营养素？',
      '如何缓解孕期腰痛？',
      '孕期运动有哪些注意事项？',
      '如何准备待产包？',
      '产后恢复需要注意什么？',
      '新生儿护理有哪些要点？'
    ];
    
    // 随机选择3个问题
    const randomQuestions = this.getRandomItems(defaultQuestions, 3);
    
    this.setData({
      recommendedQuestions: randomQuestions
    });
  },
  
  // 从数组中随机获取指定数量的元素
  getRandomItems: function(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  },
  
  // 格式化消息历史记录为API格式
  formatMessagesForAPI: function(messages) {
    return messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));
  },
  
  // 处理AI响应
  handleAIResponse: function(result) {
    const { messages } = this.data;
    
    if (result && result.content) {
      // 添加AI消息
      const aiMessage = {
        type: 'ai',
        content: result.content,
        time: new Date().toLocaleTimeString()
      };
      
      this.setData({
        messages: [...messages, aiMessage],
        isLoading: false
      });
      
      // 滚动到底部
      this.scrollToBottom();
      
      // 生成新的推荐问题
      this.generateRecommendedQuestions();
    } else {
      this.handleAIError();
    }
  },
  
  // 处理AI错误
  handleAIError: function() {
    const { messages } = this.data;
    
    // 添加错误消息
    const errorMessage = {
      type: 'ai',
      content: '抱歉，我遇到了一些问题，请稍后再试。',
      time: new Date().toLocaleTimeString()
    };
    
    this.setData({
      messages: [...messages, errorMessage],
      isLoading: false
    });
    
    // 滚动到底部
    this.scrollToBottom();
  },

  // 登录成功回调
  onLoginSuccess: function(userInfo) {
    // 更新状态
    appState.update({
      'user.isLoggedIn': true,
      'user.userInfo': userInfo
    });
    
    this.setData({
      showLoginModal: false
    });
  }
}) 