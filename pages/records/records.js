// pages/records/records.js
const app = getApp()

Page({
  data: {
    activeTab: 0,
    tabs: ['基本信息', '体征记录', '用药记录', '产检记录'],
    healthRecords: null,
    pregnancyInfo: {},
    vitalsRecords: {
      bloodPressure: [],
      weight: [],
      bloodSugar: []
    },
    medications: [],
    checkupRecords: [],
    notes: []
  },

  onLoad() {
    // 加载健康记录
    if (app.globalData.demoHealthRecords) {
      const records = app.globalData.demoHealthRecords
      
      this.setData({
        healthRecords: records,
        pregnancyInfo: records.pregnancy,
        vitalsRecords: records.vitals,
        medications: records.medications,
        notes: records.notes,
        // 模拟产检记录
        checkupRecords: [
          {
            date: '2024-06-01',
            week: 24,
            doctor: '张医生',
            hospital: '妇幼保健院',
            items: [
              { name: '体重', value: '65kg' },
              { name: '血压', value: '120/80mmHg' },
              { name: '宫高', value: '24cm' },
              { name: '胎心', value: '140次/分' }
            ],
            notes: '胎儿发育正常，建议多休息，保持适当运动'
          },
          {
            date: '2024-05-01',
            week: 20,
            doctor: '张医生',
            hospital: '妇幼保健院',
            items: [
              { name: '体重', value: '63kg' },
              { name: '血压', value: '118/78mmHg' },
              { name: '宫高', value: '20cm' },
              { name: '胎心', value: '142次/分' }
            ],
            notes: '各项指标正常，已进行四维彩超检查，胎儿发育良好'
          }
        ]
      })
    }
  },

  // 切换标签页
  switchTab(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index
    })
  },

  // 添加新记录
  addNewRecord() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    })
  },

  // 查看详情
  viewDetail(e) {
    const type = e.currentTarget.dataset.type
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '记录详情',
      content: `您查看的是${type}记录，索引为${index}`,
      showCancel: false
    })
  },
  
  // 跳转到咨询页面
  navigateToChat() {
    wx.switchTab({
      url: '/pages/chat/chat'
    })
  }
}) 