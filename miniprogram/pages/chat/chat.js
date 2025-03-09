const app = getApp()
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
    currentModel: 'DeepSeek-r1',
    // 当前模型的显示名称
    currentModelName: 'DeepSeek-r1',
    // 是否显示模型选择器
    showModelSelector: false,
    // 可用的模型类型列表
    modelOptions: MODEL_OPTIONS
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
  sendMessage() {
    const inputValue = this.data.inputValue.trim()
    
    if (!inputValue) {
      return
    }
    
    // 添加用户消息
    const updatedMessages = chatService.addUserMessage(inputValue, this.data.messages)
    
    this.setData({
      messages: updatedMessages,
      inputValue: ''
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
    weatherService.getWeatherInfo().then(weatherInfo => {
      this.setData({ weatherInfo });
    });
    
    // 获取节气信息
    const solarTermInfo = weatherService.getSolarTermInfo();
    this.setData({ solarTermInfo });
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
}) 