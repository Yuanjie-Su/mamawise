const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'
import aiService from '../../services/aiService'
import chatService from '../../services/chatService'
import messageModel from '../../models/messageModel'
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
    // 分享内容
    shareContent: '',
    // 当前分享的消息索引
    currentShareMessageIndex: null,
    // 临时图片路径
    tempImagePath: '',
    // 是否已终止回复生成
    isGeneratingStopped: false,
  },

  async onLoad() {
    this.loadData()
  },

  async onShow() {
    // 判断登录状态是否发生变化
    if (app.globalData.isLoggedIn !== this.data.isLoggedIn) {
      this.loadData()
    }
  },

  async loadData() {
    const [chatHistory, defaultRecommendedQuestions] = await Promise.all([
      chatService.getChatHistory(),
      aiService.getDefaultRecommendedQuestions(),
    ])

    this.setData({
      isLoggedIn: app.globalData.isLoggedIn,
      messages: chatHistory,
      recommendedQuestions: defaultRecommendedQuestions,
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
  sendMessage() {
    // 如果正在加载中，不允许发送新消息
    if (this.data.isLoading) {
      return
    }

    const inputValue = this.data.inputValue.trim()

    if (!inputValue) {
      return
    }

    // 添加用户消息
    const updatedMessages = chatService.addUserMessage(inputValue, this.data.messages)

    this.setData(
      {
        messages: updatedMessages,
        inputValue: '',
      },
      () => {
        // 滚动到底部
        this.scrollToBottom()

        // 生成AI回复
        this.generateAIResponse(inputValue)
      }
    )
  },

  // 生成AI回复
  async generateAIResponse(userQuery) {
    try {
      // 重置终止标志
      this.setData(
        {
          isGeneratingStopped: false,
          isLoading: true,
          loadingMessageId: this.data.messages.length + 1,
        },
        () => {
          // 滚动到底部
          this.scrollToBottom()
        }
      )

      // 创建一个变量来跟踪是否已经创建了消息
      let messageCreated = false

      // 调用AI服务生成回复
      await aiService.generateAIResponse(
        this.data.messages, // 使用当前所有消息
        userQuery,
        app.globalData.prompt_healthRecords,
        this.data.currentModelName,
        text => {
          // 如果用户已经终止了回复生成，则不再更新消息
          if (this.data.isGeneratingStopped) {
            return
          }

          // 去除markdown语法
          const formattedText = markdownUtil.stripMarkdown(text)

          // 如果是第一次收到内容，创建新消息
          if (!messageCreated) {
            const aiMessageId = this.data.loadingMessageId
            const initialAiMessage = messageModel.createSystemMessage(aiMessageId, formattedText)

            this.setData({
              messages: [...this.data.messages, initialAiMessage],
            })

            messageCreated = true
          } else {
            // 否则更新现有消息
            this.updateMessageContent(formattedText)
          }
        }
      )

      // 如果用户已经终止了回复生成，则直接返回
      if (this.data.isGeneratingStopped) {
        // 保存终止时的聊天记录
        chatService.saveChatHistory(this.data.messages)
        return
      }

      // 先保存完整的聊天记录
      chatService.saveChatHistory(this.data.messages)

      // 生成新的推荐问题，传递上下文信息
      const recommendedQuestions = await aiService.generateRecommendedQuestions(this.data.messages)
      this.setData({ recommendedQuestions })

      // 然后再设置isLoading为false并滚动到底部
      this.setData(
        {
          isLoading: false,
          loadingMessageId: null,
        },
        () => {
          // 滚动到底部
          this.scrollToBottom()
        }
      )
    } catch (error) {
      // 处理错误
      Logger.error('生成AI回复时出错:', error)

      // 如果消息已经创建，更新错误消息
      const errorMessage = '抱歉，生成回复时出现了错误，请稍后再试。'
      const updatedMessages = [...this.data.messages]

      if (updatedMessages.length > 0) {
        updatedMessages[updatedMessages.length - 1].content = errorMessage
      }

      this.setData({
        messages: updatedMessages,
        isLoading: false,
        loadingMessageId: null,
      })

      // 保存包含错误消息的聊天记录
      chatService.saveChatHistory(updatedMessages)

      // 显示错误提示
      wx.showToast({
        title: '生成回复失败',
        icon: 'none',
        duration: 2000,
      })
    }
  },

  // 更新消息内容
  updateMessageContent(text) {
    const messages = [...this.data.messages]
    const [lastMessage] = messages.slice(-1)

    if (lastMessage) {
      // 直接修改消息内容（immutable 更新）
      const newMessage = {
        ...lastMessage,
        content: lastMessage.content + text,
      }

      this.setData({
        messages: [...messages.slice(0, -1), newMessage],
      })
    }
  },

  // // 延时函数
  // sleep(ms) {
  //   return new Promise(resolve => setTimeout(resolve, ms))
  // },

  // 滚动到底部
  scrollToBottom() {
    setTimeout(() => {
      wx.createSelectorQuery()
        .select('#message-container')
        .node()
        .exec(res => {
          if (res && res[0] && res[0].node) {
            const scrollView = res[0].node
            // 尝试滚动到最后一个消息项
            scrollView.scrollIntoView({
              selector: '.message-item:last-child, .loading-container',
              animated: true,
            })
          } else {
            // 兼容旧方法
            wx.createSelectorQuery()
              .select('#message-container')
              .boundingClientRect(rect => {
                if (rect) {
                  this.setData({
                    scrollTop: 100000, // 使用一个足够大的值确保滚动到底部
                  })
                }
              })
              .exec()
          }
        })
    }, 100)
  },

  // 清空聊天记录
  clearChat() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有聊天记录吗？',
      success: res => {
        if (res.confirm) {
          chatService.clearChatHistory().then(() => {
            this.setData({
              messages: [],
              recommendedQuestions: aiService.getDefaultRecommendedQuestions(),
            })
          })
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
  stopGenerating() {
    // 设置一个标志，表示用户已经终止了回复生成
    this.setData({
      isGeneratingStopped: true,
    })

    // 调用AI服务的停止生成方法
    aiService.stopGeneration()

    // 记录日志
    Logger.info('用户终止了回复生成')

    // 更新UI状态
    this.setData({
      isLoading: false,
      loadingMessageId: null,
    })

    // 保存终止时的聊天记录
    chatService.saveChatHistory(this.data.messages)

    // 显示提示
    wx.showToast({
      title: '已终止回复生成',
      icon: 'none',
      duration: 1500,
    })

    // 生成新的推荐问题
    aiService.generateRecommendedQuestions(this.data.messages).then(questions => {
      this.setData({
        recommendedQuestions: questions,
      })
    })
  },

  // 分享消息
  shareMessage(e) {
    const content = e.currentTarget.dataset.content
    const index = e.currentTarget.dataset.index

    // 检查内容是否包含Markdown语法
    const containsMarkdown = markdownUtil.containsMarkdown(content)

    // 如果包含Markdown语法，先格式化为纯文本
    const shareContent = containsMarkdown ? markdownUtil.stripMarkdown(content) : content

    // 显示分享选项
    wx.showActionSheet({
      itemList: ['分享文本', '分享图片', '保存到相册'],
      success: res => {
        switch (res.tapIndex) {
          case 0: // 分享文本
            // 设置分享内容
            this.setData({
              shareContent: shareContent,
            })

            // 触发分享
            wx.showShareMenu({
              withShareTicket: true,
              menus: ['shareAppMessage'],
            })
            break
          case 1: // 分享图片
            // 保存当前要分享的消息索引
            this.setData({
              currentShareMessageIndex: index,
            })

            // 生成分享图片
            this.generateShareImage().then(tempFilePath => {
              if (tempFilePath) {
                this.shareImageToFriend(tempFilePath)
              }
            })
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
    let title = '收藏内容'
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

  // 收藏消息
  async toggleFavorite(e) {
    // 检查登录状态
    if (!this.data.isLoggedIn) {
      wx.showModal({
        title: '提示',
        content: '请先登录，才能收藏内容',
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

    const { content, id: messageId } = e.currentTarget.dataset

    // 获取并更新消息状态
    const messages = [...this.data.messages]
    const messageIndex = messages.findIndex(msg => msg.id === messageId)
    if (messageIndex === -1 || messages[messageIndex].isFavorited) return

    // 立即更新UI状态
    messages[messageIndex].isFavorited = true
    this.setData({ messages })

    try {
      // 准备收藏数据
      const now = new Date()
      const { title, content: contentProcessed } = this.extractTitleAndContent(content)
      const newFavorite = {
        id: Date.now().toString(),
        title,
        content: contentProcessed,
        date: this.formatDate(now),
        timestamp: now.toISOString(),
        messageId,
      }

      // 获取现有收藏列表
      const favorites = wx.getStorageSync(STORAGE_KEYS.FAVORITES) || []
      favorites.push(newFavorite)

      // 保存到本地存储
      wx.setStorage(STORAGE_KEYS.FAVORITES, favorites)

      wx.showToast({
        title: '收藏成功',
        icon: 'success',
      })
    } catch (error) {
      Logger.error('收藏失败', error)
      wx.showToast({
        title: '收藏失败',
        icon: 'none',
      })

      // 重置收藏状态
      messages[messageIndex].isFavorited = false
      this.setData({ messages })
    }

    // 保存聊天记录
    chatService.saveChatHistory(this.data.messages)
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

      // 获取系统信息
      wx.getSystemInfo({
        success: sysInfo => {
          // 创建画布上下文
          const ctx = wx.createCanvasContext('shareCanvas')
          const canvasWidth = sysInfo.windowWidth * 0.8 // 画布宽度为屏幕宽度的80%
          const padding = 30 // 内边距
          const lineHeight = 40 // 行高
          const maxTextWidth = canvasWidth - padding * 2 // 文本最大宽度

          // 计算文本高度
          const textHeight = this.calculateTextHeight(
            ctx,
            message.content,
            maxTextWidth,
            lineHeight
          )
          const canvasHeight = textHeight + padding * 2 + 120 // 额外的120是为了标题和底部

          // 设置画布高度
          this.setData({
            canvasHeight: canvasHeight,
          })

          // 绘制背景
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)

          // 绘制标题
          ctx.fillStyle = '#333333'
          ctx.font = 'bold 18px sans-serif'
          ctx.fillText('妈妈智慧', padding, padding + 20)

          // 绘制日期
          const date = new Date()
          const dateStr = this.formatDate(date)
          ctx.fillStyle = '#999999'
          ctx.font = '14px sans-serif'
          ctx.fillText(dateStr, padding, padding + 50)

          // 绘制分割线
          ctx.strokeStyle = '#EEEEEE'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(padding, padding + 70)
          ctx.lineTo(canvasWidth - padding, padding + 70)
          ctx.stroke()

          // 绘制内容
          ctx.fillStyle = '#333333'
          ctx.font = '16px sans-serif'
          this.wrapText(ctx, message.content, padding, padding + 100, maxTextWidth, lineHeight)

          // 绘制底部
          ctx.fillStyle = '#999999'
          ctx.font = '14px sans-serif'
          ctx.fillText('来自妈妈智慧小程序', padding, canvasHeight - padding)

          // 渲染画布
          ctx.draw(true, () => {
            setTimeout(() => {
              // 将画布内容保存为图片
              wx.canvasToTempFilePath({
                canvasId: 'shareCanvas',
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
              })
            }, 200) // 延迟200ms确保画布已完成渲染
          })
        },
        fail: err => {
          wx.hideLoading()
          Logger.error('获取系统信息失败', err)
          reject(err)
        },
      })
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

  // 计算文本高度
  calculateTextHeight(ctx, text, maxWidth, lineHeight) {
    // 先按换行符分割文本
    const paragraphs = text.split('\n')
    let totalHeight = 0

    // 处理每个段落
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      if (paragraph.length === 0) {
        // 空行也占一行高度
        totalHeight += lineHeight
        continue
      }

      const words = paragraph.split('')
      let line = ''
      let lineCount = 1 // 每个段落至少有一行

      for (let j = 0; j < words.length; j++) {
        const testLine = line + words[j]
        const metrics = ctx.measureText(testLine)
        const testWidth = metrics.width

        if (testWidth > maxWidth && j > 0) {
          line = words[j]
          lineCount++
        } else {
          line = testLine
        }
      }

      totalHeight += lineCount * lineHeight
    }

    return totalHeight
  },

  // 处理文本换行
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    // 先按换行符分割文本
    const paragraphs = text.split('\n')
    let currentY = y

    // 处理每个段落
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i]
      if (paragraph.length === 0) {
        // 空行也占一行高度
        currentY += lineHeight
        continue
      }

      const words = paragraph.split('')
      let line = ''

      for (let j = 0; j < words.length; j++) {
        const testLine = line + words[j]
        const metrics = ctx.measureText(testLine)
        const testWidth = metrics.width

        if (testWidth > maxWidth && j > 0) {
          ctx.fillText(line, x, currentY)
          line = words[j]
          currentY += lineHeight
        } else {
          line = testLine
        }
      }

      // 绘制段落的最后一行
      ctx.fillText(line, x, currentY)
      currentY += lineHeight // 段落之间增加一行间距
    }
  },
})
