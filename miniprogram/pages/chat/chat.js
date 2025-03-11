const app = getApp()
import Logger from '../../utils/logger'
import aiService from '../../services/aiService'
import userService from '../../services/userService'
import chatService from '../../services/chatService'
import messageModel from '../../models/messageModel'
import appConfig from '../../config/appConfig'
import markdownUtil from '../../utils/markdownUtil'

const { STORAGE_KEYS, MODEL_CONFIG, MODEL_OPTIONS } = appConfig

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
    // 正在加载的消息ID，用于标识哪条消息正在加载
    loadingMessageId: null,
    // 要滚动到的消息的标识，用于定位到特定消息
    scrollToMessage: '', 
    // 提示词
    prompt: {},
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
    // 当前使用的模型类型
    currentModel: 'DeepSeek-v3',
    // 当前模型的显示名称
    currentModelName: 'DeepSeek-v3',
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
    isGeneratingStopped: false
  },

  async onLoad() {
    Logger.debug('聊天页面加载')
    
    // 判断是否已登录
    if (app.globalData.loginStatus) {
      this.setData({
        isLoggedIn: true
      })
      // 并发执行
    await Promise.all([
      // 加载聊天记录
      this.loadChatHistory(),
      // 获取提示词
      this.loadPrompt()
    ])
    } else {
      this.setData({
        isLoggedIn: false
      })
      return
    }

    // 获取推荐问题
    this.getRecommendedQuestions(this.data.messages
      , this.data.prompt['recommended_questions'])
  },
  
  async onShow() {
    // 判断是否已登录
    if (app.globalData.loginStatus) {
      this.setData({
        isLoggedIn: true
      })
      // 并发执行
    await Promise.all([
      // 加载聊天记录
      this.loadChatHistory(),
      // 获取提示词
      this.loadPrompt()
    ])
    } else {
      this.setData({
        isLoggedIn: false
      })
      return
    }
  },

  // 加载提示词
  async loadPrompt() {
    const prompt = await userService.getPrompt()
    this.setData({
      prompt: prompt
    })
  },

  // 获取推荐问题
  async getRecommendedQuestions(messages, prompt) {
    const recommendedQuestions = await aiService.generateRecommendedQuestions(messages, prompt)
    this.setData({
      recommendedQuestions: recommendedQuestions
    })
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
    // 如果正在加载中，不允许发送新消息
    if (this.data.isLoading) {
      return;
    }
    
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
      // 重置终止标志
      this.setData({
        isGeneratingStopped: false,
        isLoading: true,
        loadingMessageId: this.data.messages.length + 1
      }, () => {
        // 滚动到底部
        this.scrollToBottom()
      })
      
      // 准备上下文信息
      const contextInfo = {
        isLoggedIn: this.data.isLoggedIn,
        hasPersonalInfo: this.data.hasPersonalInfo,
        healthRecords: this.data.healthRecords,
        currentModel: this.data.currentModel
      }
      
      // 创建一个变量来跟踪是否已经创建了消息
      let messageCreated = false
      
      // 调用AI服务生成回复
      await aiService.generateAIResponse(
        this.data.messages, // 使用当前所有消息
        userQuery,
        contextInfo,
        (text) => {
          // 如果用户已经终止了回复生成，则不再更新消息
          if (this.data.isGeneratingStopped) {
            return;
          }
          
          // 如果是第一次收到内容，创建新消息
          if (!messageCreated) {
            const aiMessageId = this.data.loadingMessageId
            // 去除Markdown元素
            const processedText = markdownUtil.stripMarkdown(text);
            const initialAiMessage = messageModel.createSystemMessage(aiMessageId, processedText)
            
            this.setData({
              messages: [...this.data.messages, initialAiMessage]
            }, () => {
              // 滚动到底部
              this.scrollToBottom()
            })
            
            messageCreated = true
          } else {
            // 否则更新现有消息
            this.updateMessageContent(text)
          }
        }
      )
      
      // 如果用户已经终止了回复生成，则直接返回
      if (this.data.isGeneratingStopped) {
        return;
      }
      
      // 先生成新的推荐问题，传递上下文信息
      const recommendedQuestions = await aiService.generateRecommendedQuestions(this.data.messages, contextInfo)
      this.setData({ recommendedQuestions })
      
      // 然后再设置isLoading为false并滚动到底部
      this.setData({
        isLoading: false,
        loadingMessageId: null
      }, () => {
        // 滚动到底部
        this.scrollToBottom()
      })
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
        loadingMessageId: null
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
      // 检查文本是否包含Markdown元素并去除
      const processedText = markdownUtil.stripMarkdown(text);
      
      // 更新内容
      lastMessage.content += processedText
      
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
            // 尝试滚动到最后一个消息项
            scrollView.scrollIntoView({
              selector: '.message-item:last-child, .loading-container',
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

  // 恢复上次使用的模型
  restoreLastUsedModel() {
    // 判断本地存储中是否存在lastUsedModel
    const lastUsedModel = wx.getStorageSync('lastUsedModel')
    if (lastUsedModel && MODEL_CONFIG[lastUsedModel]) {
      const modelConfig = MODEL_CONFIG[lastUsedModel]
      this.setData({ 
        currentModel: lastUsedModel,
        currentModelName: modelConfig.name
      })
      Logger.info(`已恢复上次使用的模型: ${lastUsedModel} (${modelConfig.name})`)
    } else {
      Logger.info('本地存储中不存在lastUsedModel')
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
      const res = await wx.cloud.callFunction({
        name: CLOUD_FUNCTIONS.GET_CHAT_HISTORY
      })
      this.setData({
        messages: res.result.lists,
        currentModel: res.result.model_name
      })
      // 确保数据加载完成后再滚动到底部
      this.scrollToBottom()
    } catch (error) {
      Logger.error('加载聊天记录失败:', error)
      this.showErrorToast('聊天记录加载异常')
    }
  },

  // 获取提示词
  async getPrompt() {
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.GET_PROMPT,
      data: {
        prompt_type: 'chat'
      }
    })  
    this.setData({ prompt: res.result })
  },
  
  // 检查消息是否已收藏
  checkFavoritedMessages(messages) {
    // 直接从本地存储获取登录状态
    const loginStatus = wx.getStorageSync(STORAGE_KEYS.LOGIN_STATUS) || false;
    
    // 只有在用户已登录的情况下才检查
    if (!loginStatus) return;
    
    // 从本地存储获取收藏列表
    wx.getStorage({
      key: 'favorites',
      success: (res) => {
        const favorites = res.data || [];
        
        // 遍历消息，检查是否已收藏
        messages.forEach(message => {
          // 只检查系统消息（AI回复）
          if (message.type === 'system') {
            // 检查是否有相同内容的收藏
            const isFavorited = favorites.some(fav => 
              fav.content === message.content || fav.messageId === message.id
            );
            
            // 设置收藏状态
            message.isFavorited = isFavorited;
          }
        });
      }
    });
  },

  // 复制消息内容
  copyMessage(e) {
    const content = e.currentTarget.dataset.content;
    
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '复制成功',
          icon: 'success',
          duration: 1500
        });
      },
      fail: (err) => {
        Logger.error('复制消息失败', err);
        wx.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },
  
  // 分享消息
  onShareAppMessage() {
    return {
      title: '妈妈智慧 - 您的孕期健康顾问',
      path: '/pages/index/index',
      imageUrl: '/images/share-cover.png',
      content: this.data.shareContent || '与AI助手的智能对话'
    }
  },

  // 终止机器人回复生成
  stopGenerating() {
    // 设置一个标志，表示用户已经终止了回复生成
    this.setData({
      isGeneratingStopped: true
    });
    
    // 调用AI服务的停止生成方法
    aiService.stopGeneration();
    
    // 记录日志
    Logger.info('用户终止了回复生成');
    
    // 更新UI状态
    this.setData({
      isLoading: false,
      loadingMessageId: null
    });
    
    // 显示提示
    wx.showToast({
      title: '已终止回复生成',
      icon: 'none',
      duration: 1500
    });
    
    // 生成新的推荐问题
    aiService.generateRecommendedQuestions(this.data.messages).then(questions => {
      this.setData({
        recommendedQuestions: questions
      });
    });
  },

  // 分享消息
  shareMessage(e) {
    const content = e.currentTarget.dataset.content;
    const index = e.currentTarget.dataset.index;
    
    // 检查内容是否包含Markdown语法
    const containsMarkdown = markdownUtil.containsMarkdown(content);
    
    // 如果包含Markdown语法，先格式化为纯文本
    const shareContent = containsMarkdown ? markdownUtil.stripMarkdown(content) : content;
    
    // 显示分享选项
    wx.showActionSheet({
      itemList: ['分享文本', '分享图片', '保存到相册'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0: // 分享文本
            // 设置分享内容
            this.setData({
              shareContent: shareContent
            });
            
            // 触发分享
            wx.showShareMenu({
              withShareTicket: true,
              menus: ['shareAppMessage']
            });
            break;
          case 1: // 分享图片
            // 保存当前要分享的消息索引
            this.setData({
              currentShareMessageIndex: index
            });
            
            // 生成分享图片
            this.generateShareImage().then((tempFilePath) => {
              if (tempFilePath) {
                this.shareImageToFriend(tempFilePath);
              }
            });
            break;
          case 2: // 保存到相册
            // 保存当前要分享的消息索引
            this.setData({
              currentShareMessageIndex: index
            });
            
            // 生成图片并保存到相册
            this.generateShareImage().then((tempFilePath) => {
              if (tempFilePath) {
                this.saveImageToAlbum(tempFilePath);
              }
            });
            break;
        }
      }
    });
  },
  
  // 收藏消息
  async toggleFavorite(e) {
    const content = e.currentTarget.dataset.content;
    const messageId = e.currentTarget.dataset.id;
    
    // // 直接从本地存储获取登录状态
    // const loginStatus = wx.getStorageSync(STORAGE_KEYS.LOGIN_STATUS) || false;
    
    // // 检查用户是否已登录
    // if (!loginStatus) {
    //   wx.showModal({
    //     title: '提示',
    //     content: '请先登录后再使用收藏功能',
    //     confirmText: '去登录',
    //     success: (res) => {
    //       if (res.confirm) {
    //         wx.navigateTo({
    //           url: '/pages/login/login'
    //         });
    //       }
    //     }
    //   });
    //   return;
    // }
    
    // // 更新登录状态
    // if (this.data.isLoggedIn !== loginStatus) {
    //   this.setData({
    //     isLoggedIn: loginStatus
    //   });
    // }
    
    // 获取当前消息
    const messages = [...this.data.messages];
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    
    if (messageIndex === -1) return;
    
    const message = messages[messageIndex];
    
    // 如果消息已经收藏，则不再处理
    if (message.isFavorited) {
      return;
    }
    
    try {
      // 立即设置为已收藏状态，禁用按钮
      message.isFavorited = true;
      this.setData({ messages });
      
      // 获取当前时间作为收藏时间
      const now = new Date();
      const timestamp = now.toISOString();
      const formattedDate = this.formatDate(now);
      
      // 从本地存储获取收藏列表
      wx.getStorage({
        key: 'favorites',
        success: async (res) => {
          let favorites = res.data || [];
          
          try {
            // 提取标题和内容
            let title = '收藏内容'; // 默认标题
            let contentProcessed = content;
            
            // 尝试提取标题（标题在后，内容在前，以---分割）
            if (content.includes('---')) {
              const parts = content.split('---');
              if (parts.length >= 2) {
                const possibleTitle = parts[parts.length - 1].trim();
                if (possibleTitle && possibleTitle.length <= 50) {
                  title = possibleTitle;
                  // 移除最后一部分（标题部分）
                  contentProcessed = parts.slice(0, parts.length - 1).join('---').trim();
                }
              }
            } 
            
            Logger.info('提取的标题和内容', { title, contentLength: contentProcessed.length });

            // 创建新的收藏项
            const newFavorite = {
              id: Date.now().toString(), // 使用时间戳作为唯一ID
              title: title, // 使用提取的标题
              content: contentProcessed, // 使用处理后的内容
              date: formattedDate,
              timestamp: timestamp,
              messageId: messageId // 保存消息ID，用于标记已收藏的消息
            };
            
            // 添加到收藏列表
            favorites.push(newFavorite);
            
            // 更新本地存储
            wx.setStorage({
              key: 'favorites',
              data: favorites,
              success: () => {
                wx.showToast({
                  title: '收藏成功',
                  icon: 'success'
                });
              },
              fail: (err) => {
                Logger.error('保存收藏失败', err);
                wx.showToast({
                  title: '收藏失败',
                  icon: 'none'
                });
                
                // 重置收藏状态
                message.isFavorited = false;
                this.setData({ messages });
              }
            });
          } catch (error) {
            Logger.error('处理收藏内容失败', error);
            // 重置收藏状态
            message.isFavorited = false;
            this.setData({ messages });
          }
        },
        fail: () => {
          // 如果没有收藏列表
          // 初始化收藏列表
          let favorites = [];

          // 处理收藏数据
          try {
            // 提取标题和内容
            let title = '收藏内容'; // 默认标题
            let contentProcessed = content;
            
            // 尝试提取标题（标题在后，内容在前，以---分割）
            if (content.includes('---')) {
              const parts = content.split('---');
              if (parts.length >= 2) {
                const possibleTitle = parts[parts.length - 1].trim();
                if (possibleTitle && possibleTitle.length <= 50) {
                  title = possibleTitle;
                  // 移除最后一部分（标题部分）
                  contentProcessed = parts.slice(0, parts.length - 1).join('---').trim();
                }
              }
            } 
            
            Logger.info('提取的标题和内容', { title, contentLength: contentProcessed.length });

            // 创建新的收藏项
            const newFavorite = {
              id: Date.now().toString(), // 使用时间戳作为唯一ID
              title: title, // 使用提取的标题
              content: contentProcessed, // 使用处理后的内容
              date: formattedDate,
              timestamp: timestamp,
              messageId: messageId // 保存消息ID，用于标记已收藏的消息
            };
            
            // 添加到收藏列表
            favorites.push(newFavorite);
            
            // 更新本地存储
            wx.setStorage({
              key: 'favorites',
              data: favorites,
              success: () => {
                wx.showToast({
                  title: '收藏成功',
                  icon: 'success'
                });
              },
              fail: (err) => {
                Logger.error('保存收藏失败', err);
                wx.showToast({
                  title: '收藏失败',
                  icon: 'none'
                });
                
                // 重置收藏状态
                message.isFavorited = false;
                this.setData({ messages });
              }
            });
          } catch (error) {
            Logger.error('处理收藏内容失败', error);
            wx.showToast({
              title: '收藏失败',
              icon: 'none',
              duration: 1500
            });
            // 重置收藏状态
            message.isFavorited = false;
            this.setData({ messages });
          }
        }
      });
    } catch (error) {
      Logger.error('收藏失败:', error);
      wx.showToast({
        title: '收藏失败',
        icon: 'none',
        duration: 1500
      });
      
      // 重置收藏状态
      message.isFavorited = false;
      this.setData({ messages });
    }
  },
  
  // 生成分享图片
  generateShareImage() {
    return new Promise((resolve, reject) => {
      const index = this.data.currentShareMessageIndex;
      
      if (index === null || index < 0 || index >= this.data.messages.length) {
        wx.showToast({
          title: '消息索引无效',
          icon: 'none'
        });
        reject(new Error('消息索引无效'));
        return;
      }
      
      const message = this.data.messages[index];
      
      if (message.type !== 'system') {
        wx.showToast({
          title: '只能分享AI回复',
          icon: 'none'
        });
        reject(new Error('只能分享AI回复'));
        return;
      }
      
      // 显示加载提示
      wx.showLoading({
        title: '生成图片中...',
        mask: true
      });
      
      // 获取系统信息
      wx.getSystemInfo({
        success: (sysInfo) => {
          // 创建画布上下文
          const ctx = wx.createCanvasContext('shareCanvas');
          const canvasWidth = sysInfo.windowWidth * 0.8; // 画布宽度为屏幕宽度的80%
          const padding = 30; // 内边距
          const lineHeight = 40; // 行高
          const maxTextWidth = canvasWidth - (padding * 2); // 文本最大宽度
          
          // 计算文本高度
          const textHeight = this.calculateTextHeight(ctx, message.content, maxTextWidth, lineHeight);
          const canvasHeight = textHeight + (padding * 2) + 120; // 额外的120是为了标题和底部
          
          // 设置画布高度
          this.setData({
            canvasHeight: canvasHeight
          });
          
          // 绘制背景
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          
          // 绘制标题
          ctx.fillStyle = '#333333';
          ctx.font = 'bold 18px sans-serif';
          ctx.fillText('妈妈智慧', padding, padding + 20);
          
          // 绘制日期
          const date = new Date();
          const dateStr = this.formatDate(date);
          ctx.fillStyle = '#999999';
          ctx.font = '14px sans-serif';
          ctx.fillText(dateStr, padding, padding + 50);
          
          // 绘制分割线
          ctx.strokeStyle = '#EEEEEE';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(padding, padding + 70);
          ctx.lineTo(canvasWidth - padding, padding + 70);
          ctx.stroke();
          
          // 绘制内容
          ctx.fillStyle = '#333333';
          ctx.font = '16px sans-serif';
          this.wrapText(ctx, message.content, padding, padding + 100, maxTextWidth, lineHeight);
          
          // 绘制底部
          ctx.fillStyle = '#999999';
          ctx.font = '14px sans-serif';
          ctx.fillText('来自妈妈智慧小程序', padding, canvasHeight - padding);
          
          // 渲染画布
          ctx.draw(true, () => {
            setTimeout(() => {
              // 将画布内容保存为图片
              wx.canvasToTempFilePath({
                canvasId: 'shareCanvas',
                success: (res) => {
                  wx.hideLoading();
                  this.setData({
                    tempImagePath: res.tempFilePath
                  });
                  resolve(res.tempFilePath);
                },
                fail: (err) => {
                  wx.hideLoading();
                  Logger.error('生成图片失败', err);
                  wx.showToast({
                    title: '生成图片失败',
                    icon: 'none'
                  });
                  reject(err);
                }
              });
            }, 200); // 延迟200ms确保画布已完成渲染
          });
        },
        fail: (err) => {
          wx.hideLoading();
          Logger.error('获取系统信息失败', err);
          reject(err);
        }
      });
    });
  },
  
  // 保存图片到相册
  saveImageToAlbum(filePath) {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success'
        });
      },
      fail: (err) => {
        Logger.error('保存图片失败', err);
        
        if (err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去授权',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
        } else {
          wx.showToast({
            title: '保存图片失败',
            icon: 'none'
          });
        }
      }
    });
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
          duration: 2000
        });
      }
    });
  },
  
  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },
  
  // 计算文本高度
  calculateTextHeight(ctx, text, maxWidth, lineHeight) {
    // 先按换行符分割文本
    const paragraphs = text.split('\n');
    let totalHeight = 0;
    
    // 处理每个段落
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (paragraph.length === 0) {
        // 空行也占一行高度
        totalHeight += lineHeight;
        continue;
      }
      
      const words = paragraph.split('');
      let line = '';
      let lineCount = 1; // 每个段落至少有一行
      
      for (let j = 0; j < words.length; j++) {
        const testLine = line + words[j];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && j > 0) {
          line = words[j];
          lineCount++;
        } else {
          line = testLine;
        }
      }
      
      totalHeight += lineCount * lineHeight;
    }
    
    return totalHeight;
  },
  
  // 处理文本换行
  wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    // 先按换行符分割文本
    const paragraphs = text.split('\n');
    let currentY = y;
    
    // 处理每个段落
    for (let i = 0; i < paragraphs.length; i++) {
      const paragraph = paragraphs[i];
      if (paragraph.length === 0) {
        // 空行也占一行高度
        currentY += lineHeight;
        continue;
      }
      
      const words = paragraph.split('');
      let line = '';
      
      for (let j = 0; j < words.length; j++) {
        const testLine = line + words[j];
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && j > 0) {
          ctx.fillText(line, x, currentY);
          line = words[j];
          currentY += lineHeight;
        } else {
          line = testLine;
        }
      }
      
      // 绘制段落的最后一行
      ctx.fillText(line, x, currentY);
      currentY += lineHeight; // 段落之间增加一行间距
    }
  },
}) 