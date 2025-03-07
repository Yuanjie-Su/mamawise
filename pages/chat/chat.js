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
      '孕期饮食有什么建议？',
      '如何缓解孕吐？',
      '孕期可以做什么运动？'
    ]
  },

  onLoad() {
    // 记录页面加载
    Logger.info('聊天页面加载')
    
    // 加载健康记录
    if (app.globalData.demoHealthRecords) {
      this.setData({
        healthRecords: app.globalData.demoHealthRecords
      })
      Logger.debug('健康记录加载成功', app.globalData.demoHealthRecords)
    } else {
      Logger.warn('未找到健康记录数据')
    }
  },

  onShow() {
    this.scrollToBottom()
    Logger.debug('聊天页面显示')
  },

  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  // 点击推荐问题
  onRecommendedQuestion(e) {
    const question = e.currentTarget.dataset.question
    Logger.info('用户点击推荐问题', { question })
    
    // 添加用户消息
    const userMessage = {
      id: this.data.messages.length + 1,
      type: 'user',
      content: question
    }
    
    this.setData({
      messages: [...this.data.messages, userMessage],
      isLoading: true,
      scrollToMessage: `message-${userMessage.id}`
    })
    
    this.scrollToBottom()
    
    // 开始生成AI回复
    this.generateAIResponse(question)
  },

  // 发送消息
  sendMessage() {
    if (!this.data.inputValue.trim() || this.data.isLoading) return
    
    const userMessage = {
      id: this.data.messages.length + 1,
      type: 'user',
      content: this.data.inputValue
    }
    
    Logger.info('用户发送消息', { content: userMessage.content })
    
    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: '',
      isLoading: true,
      scrollToMessage: `message-${userMessage.id}`
    })
    
    this.scrollToBottom()
    
    // 开始生成AI回复
    this.generateAIResponse(userMessage.content)
  },

  // 生成AI回复
  async generateAIResponse(userQuery) {
    try {
      Logger.debug('开始生成AI回复', { query: userQuery })
      
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
        scrollToMessage: `message-${aiMessageId}`
      })
      
      try {
        // 创建模型并获取流式响应
        Logger.debug('准备调用AI模型')
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
        
        Logger.info('AI模型调用成功，开始处理流式响应')
        
        // 处理流式响应
        for await (let event of res.eventStream) {
          if (event.data === '[DONE]') break
          
          const data = JSON.parse(event.data)
          const text = data?.choices?.[0]?.delta?.content
          
          if (text) {
            // 更新消息内容
            const updatedMessages = [...this.data.messages]
            updatedMessages[updatedMessages.length - 1].content += text
            updatedMessages[updatedMessages.length - 1].formattedContent = 
              this.formatMarkdown(updatedMessages[updatedMessages.length - 1].content)
            
            this.setData({
              messages: updatedMessages,
              scrollToMessage: `message-${aiMessageId}`
            })
          }
        }
        
        Logger.info('AI回复生成完成')
      } catch (apiError) {
        Logger.error('AI模型调用失败', apiError)
        
        // 如果API调用失败，回退到模拟响应
        Logger.info('回退到模拟响应')
        
        // 模拟流式响应
        const aiResponse = this.generateMockResponse(userQuery)
        
        // 模拟流式输出
        let displayedResponse = ''
        const chunks = this.splitIntoChunks(aiResponse, 5)
        
        for (let i = 0; i < chunks.length; i++) {
          await this.sleep(100)
          displayedResponse += chunks[i]
          
          // 更新消息内容
          const updatedMessages = [...this.data.messages]
          updatedMessages[updatedMessages.length - 1].content = displayedResponse
          updatedMessages[updatedMessages.length - 1].formattedContent = this.formatMarkdown(displayedResponse)
          
          this.setData({
            messages: updatedMessages,
            scrollToMessage: `message-${aiMessageId}`
          })
        }
      }
    } catch (error) {
      // 错误处理
      Logger.error('生成AI回复过程中发生错误', error)
      
      const errorMessage = {
        id: this.data.messages.length + 1,
        type: 'system',
        content: '抱歉，AI助手暂时无法响应，请稍后再试',
        formattedContent: '抱歉，AI助手暂时无法响应，请稍后再试'
      }
      
      this.setData({
        messages: [...this.data.messages, errorMessage],
        scrollToMessage: `message-${errorMessage.id}`
      })
      
      wx.showToast({
        title: '获取回复失败',
        icon: 'none'
      })
    } finally {
      this.setData({
        isLoading: false
      })
      this.scrollToBottom()
    }
  },

  // 构建系统提示词
  buildSystemPrompt() {
    Logger.debug('构建系统提示词')
    
    const healthRecords = this.data.healthRecords || {}
    let prompt = '你是一个专业的孕期顾问AI助手。你的任务是为孕妇提供准确、科学、温暖的孕期指导和建议。'
    
    // 添加孕期信息
    if (healthRecords.pregnancy) {
      const { week, dueDate, lastCheckup } = healthRecords.pregnancy
      prompt += `\n\n用户当前孕周为${week}周，预产期为${dueDate}，最近一次产检日期为${lastCheckup}。`
    }
    
    // 添加体征信息
    if (healthRecords.vitals) {
      prompt += '\n\n用户最近的体征记录：'
      
      if (healthRecords.vitals.bloodPressure && healthRecords.vitals.bloodPressure.length > 0) {
        const latestBP = healthRecords.vitals.bloodPressure[0]
        prompt += `\n- 血压（${latestBP.date}）：${latestBP.value}`
      }
      
      if (healthRecords.vitals.weight && healthRecords.vitals.weight.length > 0) {
        const latestWeight = healthRecords.vitals.weight[0]
        prompt += `\n- 体重（${latestWeight.date}）：${latestWeight.value}kg`
      }
      
      if (healthRecords.vitals.bloodSugar && healthRecords.vitals.bloodSugar.length > 0) {
        const latestBS = healthRecords.vitals.bloodSugar[0]
        prompt += `\n- 血糖（${latestBS.date}）：${latestBS.value}mmol/L`
      }
    }
    
    // 添加用药信息
    if (healthRecords.medications && healthRecords.medications.length > 0) {
      prompt += '\n\n用户当前用药：'
      healthRecords.medications.forEach(med => {
        prompt += `\n- ${med.name}（${med.dosage}，${med.frequency}）`
      })
    }
    
    // 添加过敏信息
    if (healthRecords.allergies && healthRecords.allergies.length > 0) {
      prompt += '\n\n用户过敏史：' + healthRecords.allergies.join('、')
    }
    
    // 添加医生备注
    if (healthRecords.notes && healthRecords.notes.length > 0) {
      const latestNote = healthRecords.notes[0]
      prompt += `\n\n最近医生备注（${latestNote.date}）：${latestNote.content}`
    }
    
    prompt += '\n\n请确保你的回答：'
    prompt += '\n1. 基于医学事实和科学研究'
    prompt += '\n2. 语气温和、鼓励和支持'
    prompt += '\n3. 不提供可能有害的建议'
    prompt += '\n4. 对于严重的医疗问题，建议用户咨询医生'
    prompt += '\n5. 考虑用户当前的孕周和健康状况，提供针对性的建议'
    
    Logger.debug('系统提示词构建完成', { promptLength: prompt.length })
    return prompt
  },

  // 模拟生成回复内容
  generateMockResponse(userQuery) {
    Logger.debug('使用模拟回复', { query: userQuery })
    
    const healthRecords = this.data.healthRecords || {}
    const pregnancyWeek = healthRecords.pregnancy ? healthRecords.pregnancy.week : 24
    
    // 根据用户问题和健康记录生成回复
    if (userQuery.includes('孕吐') || userQuery.includes('恶心')) {
      let response = `## 缓解孕吐的方法\n根据您目前**孕${pregnancyWeek}周**的情况，孕吐症状应该已经有所缓解。如果仍然持续，可以尝试：\n- 少食多餐，避免空腹\n- 早晨起床前先吃些干的饼干\n- 避免刺激性气味\n- 保持充分休息`
      
      // 如果有医生备注，添加相关信息
      if (healthRecords.notes && healthRecords.notes.length > 0 && healthRecords.notes[0].content.includes('孕吐')) {
        response += `\n> 根据您的医生记录，医生也提到了您的孕吐情况，建议您遵循医嘱。`
      }
      
      response += '\n**注意**：如果症状严重，请及时咨询医生。'
      return response
    } else if (userQuery.includes('饮食') || userQuery.includes('吃什么')) {
      let response = `## 孕${pregnancyWeek}周饮食指南\n在**孕${pregnancyWeek}周**，您应该保证均衡饮食，特别是富含铁、钙和蛋白质的食物。`
      
      // 添加过敏信息
      if (healthRecords.allergies && healthRecords.allergies.length > 0) {
        response += `\n> **注意**：考虑到您对${healthRecords.allergies.join('、')}过敏，请避免食用这些食物及其制品。`
      }
      
      response += `\n### 饮食建议\n根据您的健康记录，没有其他特殊的饮食禁忌，但注意：\n1. 避免生食、未煮熟的肉类\n2. 限制高汞鱼类摄入\n3. 每天摄入约2000-2200卡路里的热量\n4. 多吃新鲜蔬果\n5. 保证充足的水分摄入`
      
      // 添加体重信息
      if (healthRecords.vitals && healthRecords.vitals.weight && healthRecords.vitals.weight.length > 0) {
        response += `\n您目前的体重为${healthRecords.vitals.weight[0].value}kg，体重增长情况正常，继续保持良好的饮食习惯。`
      }
      
      return response
    } else if (userQuery.includes('运动') || userQuery.includes('锻炼')) {
      let response = `## 孕期运动指南\n**孕${pregnancyWeek}周**可以进行适度的运动，如：\n- 散步\n- 孕妇瑜伽\n- 游泳`
      
      // 添加体征信息
      if (healthRecords.vitals) {
        if (healthRecords.vitals.bloodPressure && healthRecords.vitals.bloodPressure.length > 0) {
          const bp = healthRecords.vitals.bloodPressure[0].value
          if (bp.split('/')[0] > 130 || bp.split('/')[1] > 85) {
            response += `\n> **注意**：您的血压为${bp}mmHg，略高于正常水平，建议进行温和的运动，避免剧烈活动，并定期监测血压。`
          } else {
            response += `\n您的血压为${bp}mmHg，在正常范围内，可以适度运动。`
          }
        }
        
        if (healthRecords.vitals.weight && healthRecords.vitals.weight.length > 0) {
          response += `\n您的体重增长情况正常，可以每天进行30分钟的轻度到中度运动。`
        }
      }
      
      response += `\n**重要提示**：要**避免剧烈运动**和有跌倒风险的活动。运动时如感到不适，应立即停止并休息。`
      return response
    } else if (userQuery.includes('胎动') || userQuery.includes('胎儿')) {
      return `## 胎动与胎儿发育\n在**孕${pregnancyWeek}周**，胎儿的胎动应该已经很明显了。健康的胎动频率一般是每小时3-5次。\n根据您的健康记录，您的胎儿发育正常。如果您注意到胎动突然减少或增加，或有任何异常，应及时联系医生。\n### 胎教建议\n现在胎儿已能听到外界声音，可以尝试与宝宝进行语言互动，这对胎儿的听觉发育有益。`
    } else if (userQuery.includes('睡眠') || userQuery.includes('失眠')) {
      let response = `## 孕期睡眠指南\n孕中期睡眠问题很常见。建议您：\n1. 采取左侧卧位睡姿\n2. 使用孕妇枕支撑腹部和背部\n3. 睡前避免摄入咖啡因\n4. 可以喝一杯温牛奶帮助入睡\n5. 保持规律的作息时间\n6. 睡前可以做些轻柔的伸展运动或冥想`
      
      // 如果正在服用药物
      if (healthRecords.medications && healthRecords.medications.length > 0) {
        response += `\n> **用药提示**：请注意，您目前正在服用的${healthRecords.medications.map(m => m.name).join('、')}可能会影响睡眠质量。如果您怀疑药物导致睡眠问题，请咨询医生，但不要自行停药。`
      }
      
      response += '\n**注意**：如果失眠严重影响生活，请咨询医生。'
      
      return response
    } else if (userQuery.includes('日志') || userQuery.includes('log')) {
      return `## 系统日志功能\n系统日志功能已经实现，所有操作和错误都会被记录到本地文件中。\n日志分为以下几个级别：\n- **调试(DEBUG)**：详细的技术信息，主要用于开发调试\n- **信息(INFO)**：正常操作的信息记录\n- **警告(WARN)**：潜在问题的警告，但不影响主要功能\n- **错误(ERROR)**：导致功能无法正常工作的错误\n日志文件存储在小程序的用户数据目录下，开发人员可以通过开发工具查看和导出日志文件进行分析。`
    } else {
      let response = `## 孕期健康建议\n感谢您的提问。作为您的孕期AI助手，我会根据您目前**孕${pregnancyWeek}周**的情况和健康记录提供建议。`
      
      // 添加健康状况摘要
      response += '\n### 您的健康状况摘要\n根据您的健康记录：'
      
      if (healthRecords.vitals) {
        if (healthRecords.vitals.bloodPressure && healthRecords.vitals.bloodPressure.length > 0) {
          response += `\n- 血压：${healthRecords.vitals.bloodPressure[0].value}mmHg`
        }
        if (healthRecords.vitals.weight && healthRecords.vitals.weight.length > 0) {
          response += `\n- 体重：${healthRecords.vitals.weight[0].value}kg`
        }
      }
      
      if (healthRecords.medications && healthRecords.medications.length > 0) {
        response += `\n- 当前用药：${healthRecords.medications.map(m => m.name).join('、')}`
      }
      
      response += '\n您现在的各项指标都在正常范围内，继续保持良好的生活习惯很重要。这个阶段，胎儿正在快速发育，特别是大脑和神经系统。\n如果您有特定的健康问题或疑虑，请详细描述，我会为您提供更精确的建议。'
      
      return response
    }
  },

  // 简单Markdown格式化
  formatMarkdown(text) {
    // 处理标题 (h1-h6)
    text = text.replace(/^(#{1,6})\s+(.*)$/gm, (match, hashes, content) => {
      const hLevel = hashes.length;
      if (hLevel >= 1 && hLevel <= 6) {
        return `<h${hLevel} style="font-size: ${28 - (hLevel - 1) * 2}px; font-weight: bold; margin: 6px 0;">${content}</h${hLevel}>`;
      }
      return match;
    });
    
    // 处理加粗
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // 处理斜体
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // 处理无序列表
    let hasUnorderedList = text.match(/^\s*-\s+(.*)$/gm);
    if (hasUnorderedList) {
      // 先给每个列表项添加标记，以便后续处理
      text = text.replace(/^\s*-\s+(.*)$/gm, '<!--ULSTART--><li style="margin: 2px 0;">$1</li><!--ULEND-->');
      
      // 将连续的列表项合并到一个ul中
      text = text.replace(/(<!--ULSTART-->.*?<!--ULEND-->)+/g, (match) => {
        return '<ul style="padding-left: 16px; margin: 4px 0;">' + 
          match.replace(/<!--ULSTART-->|<!--ULEND-->/g, '') + 
          '</ul>';
      });
    }
    
    // 处理有序列表
    let hasOrderedList = text.match(/^\s*\d+\.\s+(.*)$/gm);
    if (hasOrderedList) {
      // 先给每个列表项添加标记，以便后续处理
      text = text.replace(/^\s*\d+\.\s+(.*)$/gm, '<!--OLSTART--><li style="margin: 2px 0;">$1</li><!--OLEND-->');
      
      // 将连续的列表项合并到一个ol中
      text = text.replace(/(<!--OLSTART-->.*?<!--OLEND-->)+/g, (match) => {
        return '<ol style="padding-left: 16px; margin: 4px 0;">' + 
          match.replace(/<!--OLSTART-->|<!--OLEND-->/g, '') + 
          '</ol>';
      });
    }
    
    // 处理引用
    text = text.replace(/^\>\s+(.*)$/gm, '<blockquote style="border-left: 3px solid #ccc; padding-left: 8px; margin: 4px 0; color: #666;">$1</blockquote>');
    
    // 处理代码块
    text = text.replace(/```(.*?)```/gs, '<pre style="background-color: #f5f5f5; padding: 8px; border-radius: 4px; margin: 4px 0; overflow-x: auto; font-size: 12px;">$1</pre>');
    
    // 处理行内代码
    text = text.replace(/`([^`]+)`/g, '<code style="background-color: #f5f5f5; padding: 1px 3px; border-radius: 3px; font-size: 12px;">$1</code>');
    
    // 处理水平线
    text = text.replace(/^---+$/gm, '<hr style="border: none; border-top: 1px solid #eee; margin: 8px 0;">');
    
    // 处理链接
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a style="color: #0366d6; text-decoration: none;" href="$2">$1</a>');
    
    // 处理段落
    text = text.replace(/\n\n/g, '<br style="margin: 4px 0;"/>');
    
    // 处理换行
    text = text.replace(/\n/g, '<br style="margin: 2px 0;"/>');
    
    return text;
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
        .boundingClientRect(rect => {
          if (rect) {
            this.setData({
              scrollTop: rect.height
            })
          }
        })
        .exec()
    }, 100)
  },

  // 清空聊天记录
  clearChat() {
    wx.showModal({
      title: '提示',
      content: '确定要清空聊天记录吗？',
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
  
  // 跳转到健康档案页面
  navigateToRecords() {
    wx.switchTab({
      url: '/pages/records/records'
    })
    Logger.debug('用户跳转到健康档案页面')
  }
}) 