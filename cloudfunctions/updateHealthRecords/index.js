// cloudfunctions/updateHealthRecords/index.js
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { property, index, value } = event

  try {
    return await db.collection('health_records').where({
      _openid,
      property
    } ).update({
      data: {
        [property]: _.set(index, value)
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
} 
