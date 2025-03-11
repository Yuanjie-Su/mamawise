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

// 登录

// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const { code, userInfo } = event
  
  try {
    // 用code换取OpenID
    const loginRes = await cloud.openapi.login({ code });
    const openid = loginRes.openid;
    
    // 查询用户是否已存在
    const userCollection = db.collection('users')
    
    // 查询用户是否已存在
    const user = await userCollection.where({
      _openid: openid
    }).get()
    
    if (user.data.length === 0) {
      // 用户不存在，创建新用户 
      await userCollection.add({
        data: {
          _openid: openid,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        }
      })
    }

    return {
      success: true,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      error: error
    }
  }
} 