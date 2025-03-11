// cloudfunctions/deleteUserInfo/index.js
/*
云平台数据库users表
{
  "name": "users",
  "description": "用户信息集合",
  "properties": {
    "_id": {
      "description": "系统自动生成的唯一ID",
      "type": "string"
    },
    "_openid": {
      "description": "用户的微信openid",
      "type": "string"
    },
    "nickName": {
      "description": "用户昵称",
      "type": "string"
    },
    "avatarUrl": {
      "description": "头像URL",
      "type": "string"
    }
  },
  "required": ["_openid"],
  "indexes": [
    {
      "name": "openid_index",
      "unique": true,
      "fields": ["_openid"]
    }
  ],
  "permission": {
    "read": "doc._openid == auth.openid",
    "write": "doc._openid == auth.openid"
  }
} 
*/

// 删除用户信息
// 返回删除结果, 例如：{deleted: true}
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