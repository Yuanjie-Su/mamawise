// cloudfunctions/updateFavorite/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { _id, title, content } = event

  try {
    return await db.collection('favorites').where({
      _openid,
      _id
    }).update({
      data: {
        title,
        content,
        updateTime: _.serverDate()
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
}