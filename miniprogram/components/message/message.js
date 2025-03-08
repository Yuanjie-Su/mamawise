/**
 * 消息组件
 * 用于显示聊天消息，支持用户消息和系统消息
 */

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 消息类型：'user' 或 'system'
    type: {
      type: String,
      value: 'system'
    },
    // 消息内容
    content: {
      type: String,
      value: ''
    },
    // 是否允许选择文本
    selectable: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 组件内部状态
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 复制消息内容
    copyContent() {
      wx.setClipboardData({
        data: this.data.content,
        success: () => {
          wx.showToast({
            title: '已复制',
            icon: 'success',
            duration: 1500
          });
        }
      });
    },
    
    // 长按消息
    onLongPress() {
      if (this.data.type === 'system') {
        wx.showActionSheet({
          itemList: ['复制内容'],
          success: (res) => {
            if (res.tapIndex === 0) {
              this.copyContent();
            }
          }
        });
      }
    }
  }
}); 