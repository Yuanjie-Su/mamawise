const app = getApp();

Page({
  /**
   * 页面的初始数据
   */
  data: {
    favorites: [],
    loading: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.loadFavorites();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次页面显示时重新加载收藏，确保数据最新
    this.loadFavorites();
  },

  /**
   * 加载收藏列表
   */
  loadFavorites: function () {
    const that = this;
    that.setData({ loading: true });

    // 从本地存储获取收藏列表
    wx.getStorage({
      key: 'favorites',
      success: function (res) {
        // 按时间倒序排列，最新的在前面
        const favorites = res.data || [];
        favorites.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        that.setData({
          favorites: favorites,
          loading: false
        });
      },
      fail: function () {
        // 如果没有收藏数据，初始化为空数组
        that.setData({
          favorites: [],
          loading: false
        });
      }
    });
  },

  /**
   * 查看收藏详情
   */
  viewFavorite: function (e) {
    const id = e.currentTarget.dataset.id;
    const favorite = this.data.favorites.find(item => item.id === id);
    
    if (favorite) {
      // 跳转到详情页或在当前页面显示完整内容
      wx.navigateTo({
        url: `/pages/favorite-detail/favorite-detail?id=${id}`
      });
    }
  },

  /**
   * 删除收藏
   */
  deleteFavorite: function (e) {
    const that = this;
    const id = e.currentTarget.dataset.id;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条收藏吗？',
      success: function (res) {
        if (res.confirm) {
          // 用户点击确定，执行删除操作
          const updatedFavorites = that.data.favorites.filter(item => item.id !== id);
          
          // 更新本地存储
          wx.setStorage({
            key: 'favorites',
            data: updatedFavorites,
            success: function () {
              that.setData({
                favorites: updatedFavorites
              });
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
            }
          });
        }
      }
    });
  },

  /**
   * 分享收藏
   */
  shareFavorite: function (e) {
    const id = e.currentTarget.dataset.id;
    const favorite = this.data.favorites.find(item => item.id === id);
    
    if (favorite) {
      // 显示分享菜单
      wx.showActionSheet({
        itemList: ['分享给朋友', '生成图片分享'],
        success: (res) => {
          if (res.tapIndex === 0) {
            // 分享给朋友，由于小程序限制，这里只能通过按钮触发
            wx.showToast({
              title: '请点击右上角分享',
              icon: 'none'
            });
          } else if (res.tapIndex === 1) {
            // 生成图片分享
            this.generateShareImage(favorite);
          }
        }
      });
    }
  },

  /**
   * 生成分享图片
   */
  generateShareImage: function (favorite) {
    wx.showLoading({
      title: '生成图片中...',
    });
    
    // 创建画布上下文
    const ctx = wx.createCanvasContext('shareCanvas');
    
    // 设置画布背景
    ctx.setFillStyle('#ffffff');
    ctx.fillRect(0, 0, 300, 400);
    
    // 设置文本样式
    ctx.setFontSize(14);
    ctx.setFillStyle('#333333');
    
    // 绘制文本（处理文本换行）
    const text = favorite.content;
    const maxWidth = 260;
    let lastSubStrIndex = 0;
    let lineHeight = 20;
    let startY = 40;
    
    for (let i = 0; i < text.length; i++) {
      let lineWidth = ctx.measureText(text.substring(lastSubStrIndex, i)).width;
      if (lineWidth > maxWidth) {
        ctx.fillText(text.substring(lastSubStrIndex, i - 1), 20, startY);
        startY += lineHeight;
        lastSubStrIndex = i - 1;
      }
      if (i === text.length - 1) {
        ctx.fillText(text.substring(lastSubStrIndex, i + 1), 20, startY);
      }
    }
    
    // 绘制底部水印
    ctx.setFontSize(12);
    ctx.setFillStyle('#999999');
    ctx.fillText('来自妈妈智慧小程序', 20, startY + 40);
    
    // 绘制完成
    ctx.draw(false, () => {
      setTimeout(() => {
        // 将画布内容保存为图片
        wx.canvasToTempFilePath({
          canvasId: 'shareCanvas',
          success: (res) => {
            wx.hideLoading();
            // 保存图片到相册
            wx.saveImageToPhotosAlbum({
              filePath: res.tempFilePath,
              success: () => {
                wx.showToast({
                  title: '图片已保存到相册',
                  icon: 'success'
                });
              },
              fail: () => {
                wx.showToast({
                  title: '保存失败，请授权相册权限',
                  icon: 'none'
                });
              }
            });
          },
          fail: () => {
            wx.hideLoading();
            wx.showToast({
              title: '生成图片失败',
              icon: 'none'
            });
          }
        });
      }, 100);
    });
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function (res) {
    if (res.from === 'button') {
      const id = res.target.dataset.id;
      const favorite = this.data.favorites.find(item => item.id === id);
      
      if (favorite) {
        return {
          title: '妈妈智慧 - ' + favorite.content.substring(0, 30) + '...',
          path: '/pages/favorite-detail/favorite-detail?id=' + id + '&shared=true'
        };
      }
    }
    
    // 默认分享
    return {
      title: '妈妈智慧 - 我的收藏',
      path: '/pages/favorites/favorites'
    };
  }
}); 