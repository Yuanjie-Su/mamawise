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
    shareNoteId: null,
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
      // 设置要分享的笔记
      this.setData({
        shareNoteId: id,
      })
    }
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    // 获取要分享的笔记
    const noteId = this.data.shareNoteId
    let note = this.data.notes.find(item => item.id === noteId)

    if (!note && this.data.notes.length > 0) {
      // 如果没有指定笔记，则分享第一条笔记
      note = this.data.notes[0]
    }

    return {
      title: note ? note.title || '智孕笔记' : '我的智孕笔记',
      path: note ? `/pages/note-detail/note-detail?id=${note.id}` : '/pages/notes/notes',
      imageUrl: '/images/share-cover.png',
    }
  },
})
