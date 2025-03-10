// cloudfunctions/addChatHistory/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { userQuery, aiResponse, modelUsed } = event

  try {
    return await db.collection('chat_history').add({
      data: {
        _openid,
        userQuery,
        aiResponse,
        createTime: _.serverDate()
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
}