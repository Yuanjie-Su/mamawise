const app = getApp();
import Logger from '../../utils/logger';

Page({
  /**
   * 页面的初始数据
   */
  data: {
    favorite: null,
    id: null,
    isShared: false,
    isLoading: true // 加载状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取收藏ID和是否为分享页面
    const id = options.id;
    const isShared = options.shared === 'true';
    
    this.setData({
      id: id,
      isShared: isShared,
      isLoading: true
    });
    
    // 加载收藏详情
    this.loadFavoriteDetail(id);
  },

  /**
   * 加载收藏详情
   */
  loadFavoriteDetail: function (id) {
    const that = this;
    
    // 从本地存储获取收藏列表
    wx.getStorage({
      key: 'favorites',
      success: function (res) {
        const favorites = res.data || [];
        const favorite = favorites.find(item => item.id === id);
        
        if (favorite) {
          that.setData({
            favorite: favorite,
            isLoading: false
          });
        } else {
          // 未找到收藏内容
          that.setData({
            favorite: null,
            isLoading: false
          });
        }
      },
      fail: function () {
        // 未找到收藏内容
        that.setData({
          favorite: null,
          isLoading: false
        });
      }
    });
  },

  /**
   * 返回收藏列表
   */
  backToList: function () {
    wx.navigateTo({
      url: '/pages/favorites/favorites'
    });
  }
}); 