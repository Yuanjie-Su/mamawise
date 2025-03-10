// cloudfunctions/addHealthRecord/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const {property, value} = event

  try {
    // 向指定属性添加值
    return await db.collection('health_records').update({
      data: {
        [property]: _.push(value)
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
}