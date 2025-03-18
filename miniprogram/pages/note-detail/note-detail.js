const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'

const { STORAGE_KEYS } = appConfig

Page({
  /**
   * 页面的初始数据
   */
  data: {
    note: null,
    id: null,
    isShared: false,
    isLoading: true, // 加载状态
    editData: {
      title: '',
      content: '',
    },
    hasChanges: false, // 是否有未保存的更改
  },

  // =============================================
  // 页面生命周期函数
  // =============================================

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取笔记ID和是否为分享页面
    const id = options.id
    const isShared = options.shared === 'true'

    this.setData({
      id: id,
      isShared: isShared,
      isLoading: true,
    })

    // 加载笔记详情
    this.loadNoteDetail(id)

    // 设置导航栏返回按钮事件处理
    wx.setNavigationBarTitle({
      title: '笔记详情',
    })
  },

  /**
   * 页面隐藏时保存内容（如切换到其他页面或小程序）
   */
  onHide: function () {
    // 如果有未保存的更改，则保存
    if (this.data.hasChanges) {
      this.saveContent(true)
    }
  },

  /**
   * 页面卸载前保存内容
   */
  onUnload: function () {
    // 如果有未保存的更改，则保存
    if (this.data.hasChanges) {
      this.saveContent(true)
    }
  },

  /**
   * 监听用户点击右上角返回按钮或物理返回键
   */
  onBackPress: function () {
    // 如果有未保存的更改，则保存
    if (this.data.hasChanges) {
      this.saveContent(true)
    }
    return false // 返回false，由系统执行返回逻辑
  },

  // =============================================
  // 数据加载函数
  // =============================================

  /**
   * 加载笔记详情
   */
  loadNoteDetail: function (id) {
    const that = this

    // 从本地存储获取笔记列表
    wx.getStorage({
      key: STORAGE_KEYS.NOTES,
      success: function (res) {
        const notes = res.data || []
        const note = notes.find(item => item.id === id)

        if (note) {
          that.setData({
            note: note,
            isLoading: false,
            // 初始化编辑数据
            editData: {
              title: note.title || '',
              content: note.content || '',
            },
            hasChanges: false, // 初始化时没有更改
          })
        } else {
          // 未找到笔记内容
          that.setData({
            note: null,
            isLoading: false,
          })
        }
      },
      fail: function () {
        // 未找到笔记内容
        that.setData({
          note: null,
          isLoading: false,
        })
      },
    })
  },

  // =============================================
  // 编辑和保存函数
  // =============================================

  /**
   * 标题输入事件
   */
  onTitleInput: function (e) {
    this.setData({
      'editData.title': e.detail.value,
      hasChanges: true, // 标记有未保存的更改
    })
  },

  /**
   * 内容输入事件
   */
  onContentInput: function (e) {
    this.setData({
      'editData.content': e.detail.value,
      hasChanges: true, // 标记有未保存的更改
    })
  },

  /**
   * 保存内容
   * @param {Object|Boolean} e - 事件对象或静默保存标志
   */
  saveContent: function (e) {
    const that = this
    const { id, editData } = this.data

    // 判断参数类型
    const silent = typeof e === 'boolean' ? e : false

    // 如果没有更改，则不需要保存
    if (!this.data.hasChanges) {
      return
    }

    // 如果不是静默保存，显示提示
    if (!silent) {
      wx.showToast({
        title: '保存中...',
        icon: 'loading',
        duration: 1000,
      })
    }

    // 从本地存储获取笔记列表
    wx.getStorage({
      key: STORAGE_KEYS.NOTES,
      success: function (res) {
        const notes = res.data || []
        const index = notes.findIndex(item => item.id === id)

        if (index !== -1) {
          // 更新笔记内容
          notes[index].title = editData.title || '笔记内容'
          notes[index].content = editData.content

          // 更新本地存储
          wx.setStorage({
            key: STORAGE_KEYS.NOTES,
            data: notes,
            success: function () {
              // 更新本地缓存中笔记列表发生变化
              wx.setStorageSync(STORAGE_KEYS.NOTES_CHANGED, true)

              // 更新页面数据
              that.setData({
                note: notes[index],
                hasChanges: false, // 重置更改标记
              })

              // 如果不是静默保存，显示成功提示
              if (!silent) {
                wx.showToast({
                  title: '保存成功',
                  icon: 'success',
                  duration: 1500,
                })
              }
            },
            fail: function (err) {
              Logger.error('保存笔记失败', err)

              // 如果不是静默保存，显示失败提示
              if (!silent) {
                wx.showToast({
                  title: '保存失败',
                  icon: 'none',
                  duration: 1500,
                })
              }
            },
          })
        }
      },
      fail: function (err) {
        Logger.error('获取笔记列表失败', err)

        // 如果不是静默保存，显示失败提示
        if (!silent) {
          wx.showToast({
            title: '保存失败',
            icon: 'none',
            duration: 1500,
          })
        }
      },
    })
  },

  /**
   * 返回笔记列表
   */
  backToList: function () {
    // 如果有未保存的更改，则保存
    if (this.data.hasChanges) {
      this.saveContent(true)
    }
    wx.navigateBack()
  },
})
