/*
微信云开发平台提供的数据库，users集合
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

// 获取用户信息
// 返回用户信息, 例如：{nickName: '张三', avatarUrl: 'https://example.com/avatar.jpg'}

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database() 

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  try {
    const user = await db.collection('users').where({
      _openid: _openid
    }).get()
    
    if (user.data.length === 0) {
      return {
        success: false,
        error: '用户不存在'
      }
    }
    
    return {
      success: true,
      data: user.data[0]
    }
  } catch (error) {
    console.error('获取用户信息失败', error)
    return {
      success: false,
      error: error
    }
  }
} 