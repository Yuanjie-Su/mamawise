const app = getApp()
import Logger from '../../utils/logger'
import appConfig from '../../config/appConfig'

const { STORAGE_KEYS } = appConfig

Page({
  /**
   * 页面的初始数据
   */
  data: {
    favorite: null,
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
    // 获取收藏ID和是否为分享页面
    const id = options.id
    const isShared = options.shared === 'true'

    this.setData({
      id: id,
      isShared: isShared,
      isLoading: true,
    })

    // 加载收藏详情
    this.loadFavoriteDetail(id)

    // 设置导航栏返回按钮事件处理
    wx.setNavigationBarTitle({
      title: '收藏详情',
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

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    const { editData } = this.data

    // 如果有未保存的更改，先保存
    if (this.data.hasChanges) {
      this.saveContent(true)
    }

    // 使用最新的编辑数据
    const title = editData.title || '收藏内容'

    return {
      title: title,
      path: `/pages/favorite-detail/favorite-detail?id=${this.data.id}&shared=true`,
      imageUrl: '/images/share-cover.png',
    }
  },

  // =============================================
  // 数据加载函数
  // =============================================

  /**
   * 加载收藏详情
   */
  loadFavoriteDetail: function (id) {
    const that = this

    // 从本地存储获取收藏列表
    wx.getStorage({
      key: STORAGE_KEYS.FAVORITES,
      success: function (res) {
        const favorites = res.data || []
        const favorite = favorites.find(item => item.id === id)

        if (favorite) {
          that.setData({
            favorite: favorite,
            isLoading: false,
            // 初始化编辑数据
            editData: {
              title: favorite.title || '',
              content: favorite.content || '',
            },
            hasChanges: false, // 初始化时没有更改
          })
        } else {
          // 未找到收藏内容
          that.setData({
            favorite: null,
            isLoading: false,
          })
        }
      },
      fail: function () {
        // 未找到收藏内容
        that.setData({
          favorite: null,
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

    // 从本地存储获取收藏列表
    wx.getStorage({
      key: STORAGE_KEYS.FAVORITES,
      success: function (res) {
        const favorites = res.data || []
        const index = favorites.findIndex(item => item.id === id)

        if (index !== -1) {
          // 更新收藏内容
          favorites[index].title = editData.title || '收藏内容'
          favorites[index].content = editData.content

          // 更新本地存储
          wx.setStorage({
            key: STORAGE_KEYS.FAVORITES,
            data: favorites,
            success: function () {
              // 更新本地缓存中收藏列表发生变化
              wx.setStorageSync(STORAGE_KEYS.FAVORITES_CHANGED, true)

              // 更新页面数据
              that.setData({
                favorite: favorites[index],
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

              Logger.info('保存成功', favorites[index])
            },
            fail: function (err) {
              Logger.error('保存收藏失败', err)

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
        Logger.error('获取收藏列表失败', err)

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
   * 返回收藏列表
   */
  backToList: function () {
    // 如果有未保存的更改，则保存
    if (this.data.hasChanges) {
      this.saveContent(true)
    }
    wx.navigateBack()
  },

  // =============================================
  // 分享相关函数
  // =============================================

  /**
   * 分享收藏
   */
  shareFavorite: function () {
    const { editData } = this.data

    if (!editData) return

    // 如果有未保存的更改，先保存
    if (this.data.hasChanges) {
      this.saveContent(true)
    }

    wx.showActionSheet({
      itemList: ['分享文本', '复制内容'],
      success: res => {
        switch (res.tapIndex) {
          case 0: // 分享文本
            wx.showShareMenu({
              withShareTicket: true,
              menus: ['shareAppMessage'],
            })
            break
          case 1: // 复制内容
            wx.setClipboardData({
              data: `${editData.title}\n\n${editData.content}`,
              success: () => {
                wx.showToast({
                  title: '已复制到剪贴板',
                  icon: 'success',
                })
              },
            })
            break
        }
      },
    })
  },
})
