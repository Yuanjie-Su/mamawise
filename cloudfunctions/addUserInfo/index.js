// cloudfunctions/addUserInfo/index.js
// 添加用户信息
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { nickName, avatarUrl } = event

  try {
    return await db.collection('users').add({
      data: {
        _openid,
        nickName,
        avatarUrl
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
}
