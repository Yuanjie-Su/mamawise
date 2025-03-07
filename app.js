// app.js
App({
  onLaunch() {
    // 初始化云开发
    wx.cloud.init({
      env: 'cloud1-3g8wu7ny156401ea', // 替换为你的云开发环境 ID
      traceUser: true
    })

    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 登录
    wx.login({
      success: res => {
        // 发送 res.code 到后台换取 openId, sessionKey, unionId
        console.log('登录成功', res)
      }
    })
  },
  globalData: {
    userInfo: null,
    healthRecords: null,
    // 用于存储用户的健康记录
    // 实际应用中应该从服务器获取
    demoHealthRecords: {
      pregnancy: {
        week: 24,
        dueDate: '2024-12-15',
        lastCheckup: '2024-06-01'
      },
      vitals: {
        bloodPressure: [
          { date: '2024-06-01', value: '120/80' },
          { date: '2024-05-15', value: '118/78' }
        ],
        weight: [
          { date: '2024-06-01', value: 65 },
          { date: '2024-05-15', value: 64 }
        ],
        bloodSugar: [
          { date: '2024-06-01', value: 5.2 },
          { date: '2024-05-15', value: 5.0 }
        ]
      },
      medications: [
        { name: '叶酸', dosage: '0.4mg', frequency: '每日一次' },
        { name: '铁剂', dosage: '60mg', frequency: '每日一次' }
      ],
      allergies: ['青霉素'],
      notes: [
        { date: '2024-06-01', content: '胎动正常，医生建议多休息' }
      ]
    }
  }
}) 