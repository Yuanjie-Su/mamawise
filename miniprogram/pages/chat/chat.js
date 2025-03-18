const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'
import promptService from '../../services/promptService'
import aiService from '../../services/aiService'
import chatService from '../../services/chatService'
import markdownUtil from '../../utils/markdownUtil'

const { STORAGE_KEYS, MODEL_CONFIG, MODEL_OPTIONS, DEFAULT_AI_CONFIG } = appConfig

Page({
  data: {
    // 存储聊天消息的数组，每条消息可以是一个对象，包含消息内容、发送者等信息
    messages: [],
    // 输入框的当前值，用于存储用户输入的消息
    inputValue: '',
    // 消息列表的滚动位置，用于控制页面滚动到指定位置
    scrollTop: 0,
    // 是否正在加载 AI 回复的标志，用于显示加载状态
    isLoading: false,
    // 正在加载的消息ID，用于标识哪条消息正在加载
    loadingMessageId: null,
    // 要滚动到的消息的标识，用于定位到特定消息
    scrollToMessage: '',
    // 推荐问题列表，显示在页面上供用户快速选择提问，每次随机生成3个符合语境的问题
    recommendedQuestions: [],
    // 用户登录状态
    isLoggedIn: false,
    // 当前模型的显示名称
    currentModelName: DEFAULT_AI_CONFIG.MODEL,
    // 是否显示模型选择器
    showModelSelector: false,
    // 可用的模型类型列表
    modelOptions: MODEL_OPTIONS,
    // 回复风格
    replyStyle: 'default',
    // 分享内容
    shareContent: '',
    // 当前分享的消息索引
    currentShareMessageIndex: null,
    // 临时图片路径
    tempImagePath: '',
    // 是否已终止回复生成
    isGeneratingStopped: false,
    // 是否显示消息操作菜单
    showMessageActionMenu: false,
    // 当前选中的消息ID
    selectedMessageId: null,
    // 当前选中的消息类型
    selectedMessageType: null,
    // 当前选中的消息内容
    selectedMessageContent: '',
    // 当前选中的消息索引
    selectedMessageIndex: null,
    // 菜单位置
    menuPosition: 0,
  },

  async onLoad() {
    // 初始化
    this.loadData()
  },

  async onShow() {
    // 判断登录状态是否发生变化
    if (app.globalData.isLoggedIn !== this.data.isLoggedIn) {
      this.loadData()
    }
  },

  loadData() {
    const chatHistory = wx.getStorageSync(STORAGE_KEYS.CHAT_HISTORY) || []
    const defaultRecommendedQuestions = aiService.getDefaultRecommendedQuestions()

    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      messages: chatHistory,
      recommendedQuestions: defaultRecommendedQuestions,
      scrollTop: 999999,
    })
  },

  onInputChange(e) {
    this.setData({
      inputValue: e.detail.value,
    })
  },

  onRecommendedQuestion(e) {
    const question = e.currentTarget.dataset.question
    this.setData(
      {
        inputValue: question,
      },
      () => {
        this.sendMessage()
      }
    )
  },

  // 发送消息
  async sendMessage() {
    // 如果正在加载中，不允许发送新消息
    if (this.data.isLoading) {
      return
    }

    const userQuery = this.data.inputValue.trim()

    if (!userQuery) {
      return
    }

    // 添加用户消息
    const updatedMessages = chatService.addUserMessage(userQuery, this.data.messages)

    this.setData({
      messages: updatedMessages,
      inputValue: '',
      scrollTop: 999999,
    })

    // 并发生成AI回复和推荐问题
    const [, recommendedQuestions] = await Promise.all([
      this.generateAIResponse(userQuery),
      aiService.generateRecommendedQuestions(userQuery),
    ])

    // 保存聊天记录
    chatService.saveChatHistoryToCache(this.data.messages, 2)

    this.setData({
      isLoading: false,
      loadingMessageId: null,
      recommendedQuestions: recommendedQuestions,
    })
  },

  // 生成AI回复
  async generateAIResponse(userQuery) {
    try {
      // 新增ai回复消息
      const newMessage = chatService.createSystemMessage('', this.data.messages.length + 1)

      this.setData({
        isGeneratingStopped: false,
        isLoading: true,
        messages: [...this.data.messages, newMessage],
        loadingMessageId: newMessage.id,
      })

      // 生成提示词
      const prompt =
        promptService.getPrompt(this.data.replyStyle) +
        '\n\n用户健康记录：\n' +
        app.globalData.healthRecordsPrompt
      // 调用AI服务生成回复
      await aiService.generateAIResponse(
        this.data.messages.slice(-2), // 使用最后2条消息
        userQuery,
        prompt,
        this.data.currentModelName,
        text => {
          // 如果用户已经终止了回复生成，则不再更新消息
          if (this.data.isGeneratingStopped) {
            return
          }

          // 否则更新现有消息
          this.updateMessageContent(text)
        }
      )
    } catch (error) {
      // 处理错误
      Logger.error('生成AI回复时出错:', error)

      // 在最近的一条消息后面添加一条AI回复错误的消息
      const errorContent = '抱歉，生成回复时出现了错误，请稍后再试。'
      const newMessage = chatService.createSystemMessage(
        errorContent,
        this.data.messages.length + 1
      )
      this.setData({
        messages: [...this.data.messages, newMessage],
      })
    }
  },

  // 更新消息内容
  updateMessageContent(text) {
    const messages = [...this.data.messages]
    const [lastMessage] = messages.slice(-1)

    if (lastMessage) {
      // 更新原始markdown内容
      const updatedMarkdownContent = lastMessage.markdownContent
        ? lastMessage.markdownContent + text
        : text

      // 判断是否包含markdown，并处理内容
      const containsMarkdown = markdownUtil.containsMarkdown(updatedMarkdownContent)

      // 设置无markdown的纯文本内容
      const plainContent = containsMarkdown
        ? markdownUtil.stripMarkdown(updatedMarkdownContent)
        : updatedMarkdownContent

      // 生成格式化的HTML内容
      const formattedHtml = containsMarkdown
        ? markdownUtil.formatMarkdownExcludingLastLine(updatedMarkdownContent)
        : updatedMarkdownContent

      const newMessage = {
        ...lastMessage,
        content: plainContent, // content存储纯文本内容
        markdownContent: updatedMarkdownContent, // 保存原始markdown内容
        formattedContent: formattedHtml, // 保存格式化的HTML
      }

      this.setData({
        messages: [...messages.slice(0, -1), newMessage],
      })
    }
  },

  // 清空聊天记录
  clearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      success: res => {
        if (res.confirm) {
          wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY, [])
          this.setData({
            messages: [],
            recommendedQuestions: aiService.getDefaultRecommendedQuestions(),
          })
          wx.setStorageSync(STORAGE_KEYS.CHAT_HISTORY_UNSAVED_COUNTER, 0)
          chatService.clearChatHistoryOnCloud()
        }
      },
    })
  },

  // 切换模型选择器的显示状态
  toggleModelSelector() {
    this.setData({
      showModelSelector: !this.data.showModelSelector,
    })
  },

  // 选择模型
  selectModel(e) {
    const model_name = e.currentTarget.dataset.model
    this.switchModel(model_name)
    this.setData({
      showModelSelector: false,
    })
  },

  // 切换模型类型
  switchModel(model_name) {
    // 检查提供的模型类型是否有效
    const modelConfig = MODEL_CONFIG[model_name]

    if (modelConfig) {
      this.setData({
        currentModelName: modelConfig.name,
      })

      // 保存用户选择的模型到本地存储
      try {
        wx.setStorageSync('lastUsedModel', model_name)
      } catch (error) {
        Logger.error('保存模型选择时出错:', error)
      }

      // 显示切换成功的提示
      wx.showToast({
        title: `已切换至 ${modelConfig.name}`,
        icon: 'none',
        duration: 1500,
      })

      // 记录模型切换日志
      Logger.info(`模型已切换至 ${modelConfig.name} (${modelConfig.api})`)
    } else {
      // 显示错误提示
      wx.showToast({
        title: '无效的模型类型',
        icon: 'error',
        duration: 1500,
      })

      Logger.error(`尝试切换至无效的模型类型: ${modelId}`)
    }
  },

  // 关闭模型选择器
  closeModelSelector() {
    if (this.data.showModelSelector) {
      this.setData({
        showModelSelector: false,
      })
    }
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 仅用于阻止事件冒泡，不需要实际操作
    return
  },

  // 恢复上次使用的模型
  restoreLastUsedModel() {
    // 判断本地存储中是否存在lastUsedModel
    const lastUsedModel = wx.getStorageSync('lastUsedModel')
    if (lastUsedModel && MODEL_CONFIG[lastUsedModel]) {
      const modelConfig = MODEL_CONFIG[lastUsedModel]
      this.setData({
        currentModelName: modelConfig.name,
      })
      Logger.info(`已恢复上次使用的模型: ${lastUsedModel} (${modelConfig.name})`)
    } else {
      Logger.info('本地存储中不存在lastUsedModel')
    }
  },

  // 清空输入框内容
  clearInput() {
    this.setData({
      inputValue: '',
    })
    Logger.debug('用户清空了输入框')
  },

  // 复制消息内容
  copyMessage(e) {
    const content = e.currentTarget.dataset.content

    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500,
        })
      },
      fail: err => {
        Logger.error('复制消息失败', err)
        wx.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 1500,
        })
      },
    })
  },

  // 分享消息
  onShareAppMessage() {
    return {
      title: '妈妈智慧 - 您的孕期健康顾问',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png',
      content: this.data.shareContent || '与AI助手的智能对话',
    }
  },

  // 终止机器人回复生成
  async stopGenerating() {
    // 设置一个标志，表示用户已经终止了回复生成
    this.setData({
      isGeneratingStopped: true,
    })

    // 调用AI服务的停止生成方法
    aiService.stopGeneration()

    // 记录日志
    Logger.info('用户终止了回复生成')
  },

  // 分享消息
  shareMessage(e) {
    const content = e.currentTarget.dataset.content
    const index = e.currentTarget.dataset.index
    const messageId = e.currentTarget.dataset.id

    // 显示分享选项
    wx.showActionSheet({
      itemList: ['分享', '添加笔记', '保存到相册'],
      success: res => {
        switch (res.tapIndex) {
          case 0: // 分享
            // 设置分享内容
            this.setData({
              shareContent: content,
            })

            // 触发分享
            wx.showShareMenu({
              withShareTicket: true,
              menus: ['shareAppMessage'],
            })
            break
          case 1: // 添加笔记
            this.addNoteWithContent(content, messageId)
            break
          case 2: // 保存到相册
            // 保存当前要分享的消息索引
            this.setData({
              currentShareMessageIndex: index,
            })

            // 生成图片并保存到相册
            this.generateShareImage().then(tempFilePath => {
              if (tempFilePath) {
                this.saveImageToAlbum(tempFilePath)
              }
            })
            break
        }
      },
    })
  },

  // 从内容中提取标题和正文
  extractTitleAndContent(content) {
    let title = '笔记内容'
    let contentProcessed = content

    if (content.includes('---')) {
      const parts = content.split('---')
      if (parts.length >= 2) {
        const possibleTitle = parts[parts.length - 1].trim()
        if (possibleTitle && possibleTitle.length <= 50) {
          title = possibleTitle
          contentProcessed = parts
            .slice(0, parts.length - 1)
            .join('---')
            .trim()
        }
      }
    }

    return { title, content: contentProcessed }
  },

  // 添加笔记（直接点击按钮）
  addNote(e) {
    const content = e.currentTarget.dataset.content
    const messageId = e.currentTarget.dataset.id

    // 调用已有的添加笔记逻辑
    this.addNoteWithContent(content, messageId)
  },

  // 原始添加笔记逻辑
  async addNoteWithContent(content, messageId) {
    // 检查登录状态
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录，才能添加笔记',
        confirmText: '去登录',
        cancelText: '取消',
        success: res => {
          if (res.confirm) {
            // 跳转到个人中心页面
            wx.switchTab({
              url: '/pages/profile/profile',
            })
          }
        },
      })
      return
    }

    try {
      Logger.info('添加笔记：', content)

      // 准备笔记数据
      const { title, content: contentProcessed } = this.extractTitleAndContent(content)
      const now = new Date()
      const newNote = {
        id: Date.now().toString(),
        title,
        content: contentProcessed,
        date: this.formatDate(now),
        timestamp: now.getTime(),
      }

      const res = await wx.getStorage({
        key: STORAGE_KEYS.NOTES,
      })
      const notes = res.data || []

      // 添加到笔记列表
      notes.push(newNote)

      // 保存到本地存储
      wx.setStorage({
        key: STORAGE_KEYS.NOTES,
        data: notes,
        success: () => {
          wx.showToast({
            title: '添加笔记成功',
            icon: 'success',
          })
          // 更新本地缓存中笔记列表发生变化
          wx.setStorageSync(STORAGE_KEYS.NOTES_CHANGED, true)
        },
        fail: err => {
          Logger.error('添加笔记失败', err)
          wx.showToast({
            title: '添加笔记失败',
            icon: 'none',
          })
        },
      })
    } catch (error) {
      Logger.error('添加笔记失败', error)
      wx.showToast({
        title: '添加笔记失败',
        icon: 'none',
      })
    }
  },

  // 生成分享图片
  generateShareImage() {
    return new Promise((resolve, reject) => {
      const index = this.data.currentShareMessageIndex

      if (index === null || index < 0 || index >= this.data.messages.length) {
        wx.showToast({
          title: '消息索引无效',
          icon: 'none',
        })
        reject(new Error('消息索引无效'))
        return
      }

      const message = this.data.messages[index]

      if (message.type !== 'system') {
        wx.showToast({
          title: '只能分享AI回复',
          icon: 'none',
        })
        reject(new Error('只能分享AI回复'))
        return
      }

      // 显示加载提示
      wx.showLoading({
        title: '生成图片中...',
        mask: true,
      })

      try {
        // 使用新API获取窗口信息
        const windowInfo = wx.getWindowInfo()

        // 提取标题和内容
        const { title, content: contentProcessed } = this.extractTitleAndContent(message.content)

        // 获取Canvas 2D上下文
        const query = wx.createSelectorQuery()
        query
          .select('#shareCanvas')
          .fields({ node: true, size: true })
          .exec(res => {
            if (!res || !res[0] || !res[0].node) {
              wx.hideLoading()
              reject(new Error('无法获取Canvas节点'))
              return
            }

            const canvas = res[0].node
            const ctx = canvas.getContext('2d')

            // 设置画布大小
            const screenWidth = windowInfo.windowWidth
            const canvasWidth = screenWidth * 0.9 // 画布宽度为屏幕宽度的90%
            const padding = 30 // 内边距
            const lineHeight = 40 // 行高
            const maxTextWidth = canvasWidth - padding * 2 // 文本最大宽度
            const titleHeight = 60 // 标题区域高度

            // 计算文本高度
            const textHeight = this.calculateTextHeight2d(
              ctx,
              contentProcessed,
              maxTextWidth,
              lineHeight
            )

            // 计算总画布高度 - 只有标题和正文
            const canvasHeight = textHeight + padding * 3 + titleHeight

            // 设置画布尺寸（物理像素）
            const dpr = wx.getSystemInfoSync().pixelRatio
            canvas.width = canvasWidth * dpr
            canvas.height = canvasHeight * dpr

            // 缩放所有绘制操作，以适应高DPI屏幕
            ctx.scale(dpr, dpr)

            // 更新组件内的画布高度变量
            this.setData({
              canvasHeight: canvasHeight,
            })

            // 绘制背景
            ctx.fillStyle = '#FFFFFF'
            ctx.fillRect(0, 0, canvasWidth, canvasHeight)

            // 计算居中X坐标
            const centerX = canvasWidth / 2

            // 绘制标题
            ctx.fillStyle = '#333333'
            ctx.font = 'bold 20px sans-serif'
            ctx.textAlign = 'center' // 标题居中显示

            // 居中绘制标题
            ctx.fillText(title, centerX, padding + 30)

            // 绘制内容 - 使用处理后的内容，左对齐显示
            ctx.fillStyle = '#333333'
            ctx.font = '16px sans-serif'
            ctx.textAlign = 'left' // 确保文本左对齐
            this.wrapText2d(
              ctx,
              contentProcessed,
              padding,
              padding + titleHeight,
              maxTextWidth,
              lineHeight
            )

            // 将画布内容转为图片
            wx.canvasToTempFilePath(
              {
                canvas: canvas,
                success: res => {
                  wx.hideLoading()
                  this.setData({
                    tempImagePath: res.tempFilePath,
                  })
                  resolve(res.tempFilePath)
                },
                fail: err => {
                  wx.hideLoading()
                  Logger.error('生成图片失败', err)
                  wx.showToast({
                    title: '生成图片失败',
                    icon: 'none',
                  })
                  reject(err)
                },
              },
              this
            )
          })
      } catch (err) {
        wx.hideLoading()
        Logger.error('获取窗口信息失败', err)
        reject(err)
      }
    })
  },

  // 保存图片到相册
  saveImageToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success',
        })
      },
      fail: err => {
        Logger.error('保存图片失败', err)

        if (err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去授权',
            success: res => {
              if (res.confirm) {
                wx.openSetting()
              }
            },
          })
        } else {
          wx.showToast({
            title: '保存图片失败',
            icon: 'none',
          })
        }
      },
    })
  },

  // 分享图片给朋友
  shareImageToFriend(filePath) {
    // 在微信小程序中，无法直接调用系统分享，但可以通过预览图片后长按分享
    wx.previewImage({
      urls: [filePath],
      current: filePath,
      success: () => {
        wx.showToast({
          title: '长按图片可分享',
          icon: 'none',
          duration: 2000,
        })
      },
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}`
  },

  // 计算文本高度 (Canvas 2D版本)
  calculateTextHeight2d(ctx, text, maxWidth, lineHeight) {
    // 如果文本为空，返回一行的高度
    if (!text || text.trim() === '') {
      return lineHeight
    }

    // 先按换行符分割文本
    const paragraphs = text.split('\n')
    let totalHeight = 0

    // 处理每个段落
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim()
      if (paragraph.length === 0) {
        // 空行高度减小
        totalHeight += lineHeight * 0.1
        continue
      }

      let line = ''
      let lineCount = 1 // 每个段落至少有一行

      // 按单个字符分割，确保中文字符也能正确处理
      for (let j = 0; j < paragraph.length; j++) {
        const char = paragraph.charAt(j)
        const testLine = line + char
        const metrics = ctx.measureText(testLine)
        const testWidth = metrics.width

        if (testWidth > maxWidth && j > 0) {
          line = char
          lineCount++
        } else {
          line = testLine
        }
      }

      totalHeight += lineCount * lineHeight

      // 段落之间的间距
      if (i < paragraphs.length - 1) {
        totalHeight += lineHeight * 0.1
      }
    }

    // 确保文本有足够的底部间距
    return totalHeight + lineHeight * 0.3
  },

  // 处理文本换行和居中显示 (Canvas 2D版本)
  wrapText2d(ctx, text, x, y, maxWidth, lineHeight) {
    // 如果文本为空，不做任何处理
    if (!text || text.trim() === '') {
      return
    }

    // 先按换行符分割文本
    const paragraphs = text.split('\n')
    let currentY = y

    // 处理每个段落
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i].trim()
      if (paragraph.length === 0) {
        // 空行高度减小
        currentY += lineHeight * 0.1
        continue
      }

      let line = ''
      let lineStartX = x
      let lines = []

      // 收集所有的行
      for (let j = 0; j < paragraph.length; j++) {
        const char = paragraph.charAt(j)
        const testLine = line + char
        const metrics = ctx.measureText(testLine)
        const testWidth = metrics.width

        if (testWidth > maxWidth && j > 0) {
          // 收集这一行
          lines.push(line)
          line = char
        } else {
          line = testLine
        }
      }

      // 添加最后一行
      if (line.length > 0) {
        lines.push(line)
      }

      // 绘制段落的所有行，不再居中显示
      for (let j = 0; j < lines.length; j++) {
        const lineText = lines[j]

        // 所有行都从x开始（左对齐）
        ctx.fillText(lineText, x, currentY)
        currentY += lineHeight
      }

      // 段落之间增加一行间距
      if (i < paragraphs.length - 1) {
        currentY += lineHeight * 0.1 // 减小段落间间距，避免过大
      }
    }
  },

  // 长按消息处理
  onMessageLongPress(e) {
    // 加载中时不显示菜单
    if (this.data.isLoading) return

    const messageId = e.currentTarget.dataset.id
    const messageType = e.currentTarget.dataset.type

    // 获取点击位置坐标
    const touchY = e.changedTouches[0].clientY

    try {
      // 使用新API获取窗口信息
      const windowInfo = wx.getWindowInfo()
      const windowHeight = windowInfo.windowHeight

      // 查找消息
      const messageIndex = this.data.messages.findIndex(msg => msg.id === messageId)
      if (messageIndex === -1) return

      const message = this.data.messages[messageIndex]

      this.setData({
        showMessageActionMenu: true,
        selectedMessageId: messageId,
        selectedMessageType: messageType,
        selectedMessageContent: message.content,
        selectedMessageIndex: messageIndex,
        menuPosition: touchY,
      })
    } catch (err) {
      Logger.error('获取窗口信息失败', err)
    }
  },

  // 隐藏消息操作菜单
  hideMessageActionMenu() {
    this.setData({
      showMessageActionMenu: false,
    })
  },

  // 复制全文
  copyFullText() {
    wx.setClipboardData({
      data: this.data.selectedMessageContent,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500,
        })
        this.hideMessageActionMenu()
      },
      fail: err => {
        Logger.error('复制消息失败', err)
        wx.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 1500,
        })
      },
    })
  },

  // 保存消息为图片
  saveMessageImage() {
    // 设置要分享的消息索引
    this.setData({
      currentShareMessageIndex: this.data.selectedMessageIndex,
    })

    // 生成并保存图片
    this.generateShareImage()
      .then(tempFilePath => {
        if (tempFilePath) {
          this.saveImageToAlbum(tempFilePath)
          this.hideMessageActionMenu()
        }
      })
      .catch(err => {
        Logger.error('生成或保存图片失败', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none',
          duration: 1500,
        })
        this.hideMessageActionMenu()
      })
  },

  // 为选中的消息添加笔记
  addNoteForSelectedMessage() {
    this.addNoteWithContent(this.data.selectedMessageContent, this.data.selectedMessageId)
    this.hideMessageActionMenu()
  },

  // 分享选中的消息
  shareSelectedMessage() {
    // 设置分享内容
    this.setData({
      shareContent: this.data.selectedMessageContent,
      currentShareMessageIndex: this.data.selectedMessageIndex,
    })

    // 触发分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage'],
    })

    this.hideMessageActionMenu()
  },

  // 删除选中的消息
  deleteSelectedMessage() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条消息吗？',
      success: res => {
        if (res.confirm) {
          this.deleteMessage(this.data.selectedMessageId)
          this.hideMessageActionMenu()
        }
      },
    })
  },

  // 删除单条消息
  async deleteMessage(messageId) {
    // 找到并删除消息
    const updatedMessages = this.data.messages.filter(message => message.id !== messageId)

    // 更新本地状态
    this.setData({
      messages: updatedMessages,
    })

    // 更新本地存储
    wx.setStorage({
      key: STORAGE_KEYS.CHAT_HISTORY,
      data: updatedMessages,
      success: async () => {
        Logger.info('删除消息本地缓存成功', messageId)
        // 删除云数据库中的消息
        chatService.deleteChatHistoryOnCloud(messageId)
      },
      fail: err => {
        Logger.error('删除消息失败', err)
      },
    })
  },

  // 保存到图片（直接点击按钮）
  saveToImage(e) {
    const index = e.currentTarget.dataset.index

    // 设置当前要分享的消息索引
    this.setData({
      currentShareMessageIndex: index,
    })

    // 显示加载提示
    wx.showLoading({
      title: '正在保存...',
      mask: true,
    })

    // 生成并保存图片
    this.generateShareImage()
      .then(tempFilePath => {
        if (tempFilePath) {
          this.saveImageToAlbum(tempFilePath)
        }
        wx.hideLoading()
      })
      .catch(err => {
        wx.hideLoading()
        Logger.error('保存图片失败', err)
        wx.showToast({
          title: '保存失败',
          icon: 'none',
          duration: 1500,
        })
      })
  },

  // 长按消息项
  messageItemLongTap(e) {
    const { content, messageId, index, type } = e.currentTarget.dataset

    // 保存选中的消息信息
    this.setData({
      selectedMessageContent: content,
      selectedMessageId: messageId,
      selectedMessageIndex: index,
      selectedMessageType: type,
      showMessageActionMenu: true,
    })
  },
})
