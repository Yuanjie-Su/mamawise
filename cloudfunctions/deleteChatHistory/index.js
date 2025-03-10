// cloudfunctions/deleteChatHistory/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { _id } = event

  try {
    return await db.collection('chat_history').where({
      _openid,
      _id
    }).remove()
  } catch (e) {
    console.error(e)
    return e
  }
}