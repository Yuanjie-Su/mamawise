// cloudfunctions/addUserInfo/index.js
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

// 添加用户信息, 例如：event.nickName = '张三', event.avatarUrl = 'https://example.com/avatar.jpg'
// 返回添加结果, 例如：{added: true}

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
