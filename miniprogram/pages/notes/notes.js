const app = getApp()
import appConfig from '../../config/appConfig'
import Logger from '../../utils/logger'
const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig

Page({
  /**
   * 页面的初始数据
   */
  data: {
    notes: [],
    loading: true,
  },

  // =============================================
  // 页面生命周期函数
  // =============================================

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadNotes()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次页面显示时重新加载收藏，确保数据最新
    this.loadNotes()
  },

  // =============================================
  // 数据加载函数
  // =============================================

  /**
   * 加载笔记列表
   */
  loadNotes: function () {
    this.setData({ loading: true })

    wx.getStorage({
      key: STORAGE_KEYS.NOTES,
      success: res => {
        const notes = res.data || []

        this.setData({
          notes: notes,
          loading: false,
        })
      },
      fail: () => {
        this.setData({
          notes: [],
          loading: false,
        })
      },
    })
  },

  // =============================================
  // 笔记操作函数
  // =============================================

  /**
   * 查看笔记详情
   */
  viewNote: function (e) {
    const id = e.currentTarget.dataset.id
    const note = this.data.notes.find(item => item.id === id)

    if (note) {
      // 跳转到详情页或在当前页面显示完整内容
      wx.navigateTo({
        url: `/pages/note-detail/note-detail?id=${id}`,
      })
    }
  },

  /**
   * 删除笔记
   */
  deleteNote: function (e) {
    const that = this
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条笔记吗？',
      success: function (res) {
        if (res.confirm) {
          // 用户点击确定，执行删除操作
          const updatedNotes = that.data.notes.filter(item => item.id !== id)

          // 更新本地存储
          wx.setStorage({
            key: STORAGE_KEYS.NOTES,
            data: updatedNotes,
            success: function () {
              that.setData({
                notes: updatedNotes,
              })

              // 删除云数据库中的笔记
              wx.cloud
                .callFunction({
                  name: CLOUD_FUNCTIONS.DELETE_NOTE,
                  data: { id },
                })
                .then(res => {
                  if (!res || !res.result || !res.result.success) {
                    Logger.error('删除笔记云端同步失败', res.result.error)
                  }
                })
                .catch(err => {
                  Logger.error('删除笔记云端同步失败', err)
                })
            },
          })
        }
      },
    })
  },

  // =============================================
  // 分享相关函数
  // =============================================

  /**
   * 分享笔记
   */
  shareNote: function (e) {
    const id = e.currentTarget.dataset.id
    const note = this.data.notes.find(item => item.id === id)

    if (note) {
      // 显示分享菜单
      wx.showActionSheet({
        itemList: ['分享给朋友', '生成图片分享'],
        success: res => {
          if (res.tapIndex === 0) {
            // 分享给朋友，由于小程序限制，这里只能通过按钮触发
            wx.showToast({
              title: '请点击右上角分享',
              icon: 'none',
            })
          } else if (res.tapIndex === 1) {
            // 生成图片分享
            this.generateShareImage(note)
          }
        },
      })
    }
  },

  /**
   * 生成分享图片
   */
  generateShareImage: function (note) {
    wx.showLoading({
      title: '生成图片中...',
    })

    // 创建画布上下文
    const ctx = wx.createCanvasContext('shareCanvas')

    // 设置画布背景
    ctx.setFillStyle('#ffffff')
    ctx.fillRect(0, 0, 300, 400)

    // 设置文本样式
    ctx.setFontSize(14)
    ctx.setFillStyle('#333333')

    // 绘制文本（处理文本换行）
    const text = note.content
    const maxWidth = 260
    let lastSubStrIndex = 0
    let lineHeight = 20
    let startY = 40

    for (let i = 0; i < text.length; i++) {
      let lineWidth = ctx.measureText(text.substring(lastSubStrIndex, i)).width
      if (lineWidth > maxWidth) {
        ctx.fillText(text.substring(lastSubStrIndex, i - 1), 20, startY)
        startY += lineHeight
        lastSubStrIndex = i - 1
      }
      if (i === text.length - 1) {
        ctx.fillText(text.substring(lastSubStrIndex, i + 1), 20, startY)
      }
    }

    // 绘制底部水印
    ctx.setFontSize(12)
    ctx.setFillStyle('#999999')
    ctx.fillText('来自妈妈智慧小程序', 20, startY + 40)

    // 绘制完成
    ctx.draw(false, () => {
      setTimeout(() => {
        // 将画布内容保存为图片
        wx.canvasToTempFilePath({
          canvasId: 'shareCanvas',
          success: res => {
            wx.hideLoading()
            // 保存图片到相册
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({
                  title: '图片已保存到相册',
                  icon: 'success',
                })
              },
              fail: () => {
                wx.showToast({
                  title: '保存失败，请授权相册权限',
                  icon: 'none',
                })
              },
            })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({
              title: '生成图片失败',
              icon: 'none',
            })
          },
        })
      }, 100)
    })
  },
})
