const app = getApp()
import Logger from '../../utils/logger'

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
  },

  onLoad() {
    // 记录页面加载
    Logger.info('聊天页面加载')
    
    // 检查用户登录状态
    this.checkLoginStatus()
    
    // 获取天气和节气信息
    this.getWeatherInfo()
    this.getSolarTermInfo()
  },
  
  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
    
    // 获取天气和节气信息
    this.getWeatherInfo()
    this.getSolarTermInfo()
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
      
      try {
        // 创建模型并获取流式响应
        const model = wx.cloud.extend.AI.createModel("deepseek")
        const res = await model.streamText({
          data: {
            model: "deepseek-v3",
            messages: [
              {
                role: "system",
                content: this.buildSystemPrompt()
              },
              {
                role: "user",
                content: userQuery
              }
            ]
          }
        })
        
        // 处理流式响应
        for await (let event of res.eventStream) {
          if (event.data === '[DONE]') break
          
          const data = JSON.parse(event.data)
          const text = data?.choices?.[0]?.delta?.content
          
          if (text) {
            // 更新消息内容
            const updatedMessages = [...this.data.messages]
            updatedMessages[updatedMessages.length - 1].content += text
            
            this.setData({
              messages: updatedMessages
            }, () => {
              // 每次更新内容后滚动到底部
              this.scrollToBottom()
            })
          }
        }
        
        // 响应完成后
        this.setData({
          isLoading: false
        }, () => {
          // 确保最后一次滚动到底部
          this.scrollToBottom()
        })
      } catch (error) {
        // 处理错误情况
        this.setData({
          isLoading: false
        })
        
        // 添加错误消息
        const errorMessage = {
          id: this.data.messages.length + 1,
          type: 'system',
          content: '抱歉，AI回复生成失败，请稍后再试。',
          formattedContent: '<p style="color: #ff4d4f;">抱歉，AI回复生成失败，请稍后再试。</p>'
        }
        
        this.setData({
          messages: [...this.data.messages, errorMessage]
        }, () => {
          this.scrollToBottom()
        })
      }
    } catch (error) {
      this.setData({
        isLoading: false
      })
    }
  },

  // 构建系统提示词
  buildSystemPrompt() {
    let systemPrompt = `你是一位专业的AI助手，名为"智慧助手"。你的任务是为用户提供准确、科学的健康建议和知识。
请根据用户的问题，提供简洁明了的回答，避免过长的内容。
回答应当基于医学共识和科学研究，避免提供有争议的建议。
如果用户询问的问题超出你的能力范围或需要专业医疗诊断，请建议用户咨询医生。
请使用友善、温暖的语气，避免使用过于专业的医学术语，确保普通用户能够理解。`

    // 添加天气和节气信息
    systemPrompt += `\n\n今日环境信息：
- 天气：${this.data.weatherInfo.description}，${this.data.weatherInfo.temperature}°C
- 节气：${this.data.solarTermInfo}`

    // 如果用户已登录且已完善个人信息，添加个性化信息
    if (this.data.isLoggedIn && this.data.hasPersonalInfo && this.data.healthRecords) {
      const records = this.data.healthRecords
      
      systemPrompt += `\n\n用户当前信息：
- 孕周：${records.pregnancy.week}周
- 预产期：${records.pregnancy.dueDate}`

      // 添加末次产检信息（如果有）
      if (records.pregnancy.lastCheckup) {
        systemPrompt += `\n- 最近一次产检：${records.pregnancy.lastCheckup}`
      }

      // 添加体征信息
      if (records.vitals && records.vitals.bloodPressure && records.vitals.bloodPressure.length > 0) {
        systemPrompt += `\n- 最近血压：${records.vitals.bloodPressure[0].value}`
      }
      
      if (records.vitals && records.vitals.weight && records.vitals.weight.length > 0) {
        systemPrompt += `\n- 最近体重：${records.vitals.weight[0].value}kg`
      }
      
      // 添加过敏信息
      if (records.allergies && records.allergies.length > 0) {
        systemPrompt += `\n- 过敏史：${records.allergies.join(', ')}`
      }
      
      // 添加饮食偏好信息
      if (records.dietPreferences && records.dietPreferences.length > 0) {
        systemPrompt += `\n- 饮食偏好：${records.dietPreferences.join(', ')}`
      }
      
      // 添加用药信息
      if (records.medications && records.medications.length > 0) {
        systemPrompt += `\n- 当前用药：${records.medications.map(med => `${med.name} ${med.dosage} ${med.frequency}`).join(', ')}`
      }
      
      // 添加产检记录分析信息
      if (records.checkupAnalysis) {
        systemPrompt += `\n- 产检记录分析：${records.checkupAnalysis}`
      }
      
      systemPrompt += `\n\n请根据用户的健康记录提供个性化的建议。特别注意用户的过敏史和饮食偏好，在提供饮食建议时避免推荐用户过敏的食物，并尊重用户的饮食偏好。同时，考虑当前的天气和节气情况，提供更加适合的健康建议。`
    } else {
      // 如果用户未登录或未完善个人信息，也添加天气和节气相关建议
      systemPrompt += `\n\n请在回答用户问题时，适当考虑当前的天气和节气情况，提供更加贴合实际环境的健康建议。`
    }
    
    return systemPrompt
  },

  // 简单Markdown格式化
  formatMarkdown(text) {
    if (!text) return '';
    
    try {
      // 使用更简单的HTML格式，避免复杂的嵌套结构
      
      // 处理标题 (h1-h6)
      text = text.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, content) => {
        const hLevel = hashes.length;
        const fontSize = 28 - (hLevel - 1) * 2;
        return `<div style="font-size:${fontSize}px;font-weight:bold;margin:8px 0;">${content}</div>`;
      });
      
      // 处理加粗
      text = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
      
      // 处理斜体
      text = text.replace(/\*(.*?)\*/g, '<i>$1</i>');
      
      // 处理无序列表
      text = text.replace(/^\s*-\s+(.*)$/gm, '<div style="margin-left:16px;">• $1</div>');
      
      // 处理有序列表
      let listIndex = 0;
      text = text.replace(/^\s*\d+\.\s+(.*)$/gm, (match) => {
        listIndex++;
        return match.replace(/^\s*\d+\.\s+(.*)$/, `<div style="margin-left:16px;">${listIndex}. $1</div>`);
      });
      
      // 处理引用
      text = text.replace(/^\>\s+(.*)$/gm, '<div style="border-left:3px solid #ccc;padding-left:8px;color:#666;margin:4px 0;">$1</div>');
      
      // 处理代码块
      text = text.replace(/```([\s\S]*?)```/g, '<div style="background-color:#f5f5f5;padding:8px;border-radius:4px;font-family:monospace;white-space:pre-wrap;margin:8px 0;font-size:12px;">$1</div>');
      
      // 处理行内代码
      text = text.replace(/`([^`]+)`/g, '<span style="background-color:#f5f5f5;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:12px;">$1</span>');
      
      // 处理水平线
      text = text.replace(/^---+$/gm, '<div style="border-top:1px solid #eee;margin:8px 0;"></div>');
      
      // 处理链接
      text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a style="color:#0366d6;" href="$2">$1</a>');
      
      // 处理段落
      text = text.replace(/\n\n/g, '<div style="margin:8px 0;"></div>');
      
      // 处理换行
      text = text.replace(/\n/g, '<br>');
      
      // 添加调试信息
      console.log('格式化后的内容长度:', text.length);
      
      return text;
    } catch (error) {
      console.error('Markdown格式化错误:', error);
      // 如果格式化失败，返回纯文本
      return text.replace(/\n/g, '<br>');
    }
  },

  // 将文本分成小块以模拟流式输出
  splitIntoChunks(text, chunkSize) {
    const chunks = []
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize))
    }
    return chunks
  },

  // 延迟函数
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
  
  // 获取节气信息（简化版，实际应用中应该使用更精确的计算方法）
  getSolarTermInfo() {
    const today = new Date()
    const month = today.getMonth() + 1 // 月份从0开始，需要+1
    const day = today.getDate()
    
    let solarTerm = ''
    
    // 简化的节气判断（实际应用中应该使用更精确的计算方法）
    if ((month === 2 && day >= 3 && day <= 5) || (month === 2 && day === 6 && today.getHours() < 12)) {
      solarTerm = '立春'
    } else if ((month === 2 && day >= 18 && day <= 20) || (month === 2 && day === 21 && today.getHours() < 12)) {
      solarTerm = '雨水'
    } else if ((month === 3 && day >= 5 && day <= 7) || (month === 3 && day === 8 && today.getHours() < 12)) {
      solarTerm = '惊蛰'
    } else if ((month === 3 && day >= 20 && day <= 22) || (month === 3 && day === 23 && today.getHours() < 12)) {
      solarTerm = '春分'
    } else if ((month === 4 && day >= 4 && day <= 6) || (month === 4 && day === 7 && today.getHours() < 12)) {
      solarTerm = '清明'
    } else if ((month === 4 && day >= 19 && day <= 21) || (month === 4 && day === 22 && today.getHours() < 12)) {
      solarTerm = '谷雨'
    } else if ((month === 5 && day >= 5 && day <= 7) || (month === 5 && day === 8 && today.getHours() < 12)) {
      solarTerm = '立夏'
    } else if ((month === 5 && day >= 20 && day <= 22) || (month === 5 && day === 23 && today.getHours() < 12)) {
      solarTerm = '小满'
    } else if ((month === 6 && day >= 5 && day <= 7) || (month === 6 && day === 8 && today.getHours() < 12)) {
      solarTerm = '芒种'
    } else if ((month === 6 && day >= 21 && day <= 23) || (month === 6 && day === 24 && today.getHours() < 12)) {
      solarTerm = '夏至'
    } else if ((month === 7 && day >= 6 && day <= 8) || (month === 7 && day === 9 && today.getHours() < 12)) {
      solarTerm = '小暑'
    } else if ((month === 7 && day >= 22 && day <= 24) || (month === 7 && day === 25 && today.getHours() < 12)) {
      solarTerm = '大暑'
    } else if ((month === 8 && day >= 7 && day <= 9) || (month === 8 && day === 10 && today.getHours() < 12)) {
      solarTerm = '立秋'
    } else if ((month === 8 && day >= 22 && day <= 24) || (month === 8 && day === 25 && today.getHours() < 12)) {
      solarTerm = '处暑'
    } else if ((month === 9 && day >= 7 && day <= 9) || (month === 9 && day === 10 && today.getHours() < 12)) {
      solarTerm = '白露'
    } else if ((month === 9 && day >= 22 && day <= 24) || (month === 9 && day === 25 && today.getHours() < 12)) {
      solarTerm = '秋分'
    } else if ((month === 10 && day >= 8 && day <= 10) || (month === 10 && day === 11 && today.getHours() < 12)) {
      solarTerm = '寒露'
    } else if ((month === 10 && day >= 23 && day <= 25) || (month === 10 && day === 26 && today.getHours() < 12)) {
      solarTerm = '霜降'
    } else if ((month === 11 && day >= 7 && day <= 9) || (month === 11 && day === 10 && today.getHours() < 12)) {
      solarTerm = '立冬'
    } else if ((month === 11 && day >= 22 && day <= 24) || (month === 11 && day === 25 && today.getHours() < 12)) {
      solarTerm = '小雪'
    } else if ((month === 12 && day >= 6 && day <= 8) || (month === 12 && day === 9 && today.getHours() < 12)) {
      solarTerm = '大雪'
    } else if ((month === 12 && day >= 21 && day <= 23) || (month === 12 && day === 24 && today.getHours() < 12)) {
      solarTerm = '冬至'
    } else if ((month === 1 && day >= 5 && day <= 7) || (month === 1 && day === 8 && today.getHours() < 12)) {
      solarTerm = '小寒'
    } else if ((month === 1 && day >= 20 && day <= 22) || (month === 1 && day === 23 && today.getHours() < 12)) {
      solarTerm = '大寒'
    } else {
      // 如果不在节气日期范围内，显示最近的节气
      if (month === 1 && day < 5) {
        solarTerm = '冬至后'
      } else if (month === 1 && day > 22) {
        solarTerm = '大寒后'
      } else if (month === 2 && day < 3) {
        solarTerm = '大寒后'
      } else if (month === 2 && day > 20) {
        solarTerm = '雨水后'
      } else {
        solarTerm = '节气间'
      }
    }
    
    this.setData({
      solarTermInfo: solarTerm
    })
  }
}) 