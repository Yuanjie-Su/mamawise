// 云函数入口文件
/*
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

// 更新用户信息, 指定更新属性
// 例如：event.property = 'nickName'
// 例如：event.value = '新昵称'

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { property, value } = event

  try {
    return await db.collection('users').where({
      _openid
    }).update({
      data: {
        [property]: value
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
} 