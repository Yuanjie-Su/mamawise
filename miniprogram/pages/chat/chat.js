const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'
import promptService from '../../services/promptService'
import aiService from '../../services/aiService'
import chatService from '../../services/chatService'
import markdownUtil from '../../utils/markdownUtil'
import messageService from '../../services/messageService'
import noteService from '../../services/noteService'
import textUtil from '../../utils/textUtil'
import canvasUtil from '../../utils/canvasUtil'

const { STORAGE_KEYS, MODEL_CONFIG, DEFAULT_AI_CONFIG } = appConfig

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
    // 当前模型的名称（从设置中读取）
    currentModelName: DEFAULT_AI_CONFIG.MODEL,
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
    // 加载上次使用的模型
    this.loadModelSettings()
  },

  async onShow() {
    // 判断登录状态是否发生变化
    if (app.globalData.isLoggedIn !== this.data.isLoggedIn) {
      this.loadData()
    }

    // 检查模型设置是否变化
    this.loadModelSettings()
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
    messageService.copyMessage(content)
  },

  // 分享消息
  onShareAppMessage() {
    return messageService.shareMessage({
      content: this.data.shareContent,
    })
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

    // 设置分享内容
    this.setData({
      shareContent: content,
    })

    // 触发分享
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage'],
    })
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
    await messageService.addNote(content, messageId, this.data.isLoggedIn)
  },

  // 生成分享图片
  generateShareImage() {
    const index = this.data.currentShareMessageIndex

    if (index === null || index < 0 || index >= this.data.messages.length) {
      wx.showToast({
        title: '消息索引无效',
        icon: 'none',
      })
      return Promise.reject(new Error('消息索引无效'))
    }

    const message = this.data.messages[index]

    if (message.type !== 'system') {
      wx.showToast({
        title: '只能分享AI回复',
        icon: 'none',
      })
      return Promise.reject(new Error('只能分享AI回复'))
    }

    return canvasUtil.generateShareImage(
      message,
      {
        titleExtractor: textUtil.extractTitleAndContent,
      },
      this
    )
  },

  // 长按消息处理
  onMessageLongPress(e) {
    messageService.handleMessageLongPress(e, this)
  },

  // 隐藏消息操作菜单
  hideMessageActionMenu() {
    this.setData({
      showMessageActionMenu: false,
    })
  },

  // 复制全文
  copyFullText() {
    messageService
      .copyMessage(this.data.selectedMessageContent)
      .then(() => this.hideMessageActionMenu())
      .catch(() => this.hideMessageActionMenu())
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
          canvasUtil.saveImageToAlbum(tempFilePath)
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
          canvasUtil.saveImageToAlbum(tempFilePath)
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

  // 阻止事件冒泡
  stopPropagation() {
    // 仅用于阻止事件冒泡
    return
  },

  // 加载模型设置
  loadModelSettings() {
    try {
      // 从本地存储获取当前模型
      const lastUsedModel = wx.getStorageSync('lastUsedModel')
      if (lastUsedModel && MODEL_CONFIG[lastUsedModel]) {
        const modelConfig = MODEL_CONFIG[lastUsedModel]
        if (this.data.currentModelName !== modelConfig.name) {
          this.setData({
            currentModelName: modelConfig.name,
          })
          Logger.info(`已加载模型设置: ${lastUsedModel} (${modelConfig.name})`)
        }
      }
    } catch (error) {
      Logger.error('加载模型设置失败', error)
    }
  },
})
