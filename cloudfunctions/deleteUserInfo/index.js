// cloudfunctions/deleteUserInfo/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const db = cloud.database()

  try {
    return await db.collection('users').where({
      _openid
    }).remove()
  } catch (e) {
    console.error(e)
    return e
  }
}