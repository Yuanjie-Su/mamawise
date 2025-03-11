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
// 返回

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const db = cloud.database()

  try {
    await db.collection('users').where({
      _openid: openid
    }).update({
      data: {
        [event.property]: event.value
      }
    })

    return {
      success: true,
      error: null
    }
  } catch (e) {
    // 处理错误类型
    let errorMessage = '更新失败';
    let errorCode = 500;

    if (e.code === 'DATABASE_ERROR') {
      errorMessage = '数据库操作失败';
      errorCode = 400;
    } else if (e.code === 'NETWORK_ERROR') {
      errorMessage = '网络连接失败';
      errorCode = 503;
    }

    // 开发环境下保留完整错误信息
    const errorDetails = process.env.NODE_ENV === 'development' 
      ? { stack: e.stack } 
      : null;

    return {
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        details: errorDetails
      }
    }
  }
} 