// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  try {
    // 获取用户openid
    const openid = wxContext.OPENID
    
    // 查询用户是否已存在
    const db = cloud.database()
    const userCollection = db.collection('users')
    
    const user = await userCollection.where({
      _openid: openid
    }).get()
    
    if (user.data.length === 0) {
      // 用户不存在，创建新用户
      await userCollection.add({
        data: {
          _openid: openid,
          createTime: db.serverDate(),
          hasPersonalInfo: false
        }
      })
    }
    
    return {
      success: true,
      openid: openid,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
    }
  } catch (error) {
    console.error('登录失败', error)
    return {
      success: false,
      error: error
    }
  }
} 