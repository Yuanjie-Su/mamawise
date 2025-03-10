// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { nickName, avatarUrl } = event

  const db = cloud.database()

  try {
    return await db.collection('users').where({
      _openid
    }).update({
      data: {
        nickName,
        avatarUrl
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
} 