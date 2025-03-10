// cloudfunctions/updateChatHistory/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { _id, userQuery, aiResponse, modelUsed } = event

  try {
    return await db.collection('chat_history').where({
      _openid,
      _id
    }).update({
      data: {
        userQuery,
        aiResponse,
        updateTime: _.serverDate()
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
}