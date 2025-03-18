// 清除聊天记录
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  try {
    await db
      .collection('chat_history')
      .where({
        _openid: openid,
      })
      .remove()

    return {
      success: true,
    }
  } catch (e) {
    return {
      success: false,
      error: e,
    }
  }
}
