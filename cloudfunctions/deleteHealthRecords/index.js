// cloudfunctions/addFavorite/deleteHealthRecords/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  // 删除指定属性的某条记录
  const { property, index } = event
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  try {
    return await db.collection('health_records').where({
      _openid,
      property
    }).update({
      data: {
        [property]: _.pullAt(index)
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
}
