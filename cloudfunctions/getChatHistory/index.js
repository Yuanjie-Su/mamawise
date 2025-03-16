/*
云平台数据库chat_history表
{
  "name": "chat_history",
  "description": "用户与AI的聊天历史记录集合",
  "properties": {
    "_id": {
      "description": "系统自动生成的唯一ID",
      "type": "string"
    },
    "_openid": {
      "description": "用户的微信openid",
      "type": "string",
      "default": "system-generated"
    },
    "messages": {
      "description": "messages列表,object数组",
      "type": "array",
      "default": []
    }
  },
  "required": ["_openid"],
  "indexes": [
    {
      "name": "openid_index",
      "fields": ["_openid"]
    }
  ],
  "permission": {
    "read": "doc._openid == auth.openid",
    "write": "doc._openid == auth.openid"
  }
} 
*/
// 获取聊天记录
// 返回messages属性

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const chatHistoryCollection = db.collection('chat_history')

exports.main = async (event, context) => {
  try {
    // 获取openid
    const openid = cloud.getWXContext().OPENID

    // 获取数据库中_openid对应的记录
    const doc = await chatHistoryCollection
      .where({
        _openid: openid,
      })
      .get()

    // 记录存在
    if (doc.data.length > 0) {
      return {
        success: true,
        messages: doc.data[0].messages,
      }
    }

    // 记录不存在，创建记录
    await chatHistoryCollection.add({
      data: {
        _openid: openid,
        messages: [],
      },
      setUnionId: false,
    })

    // 返回空列表
    return {
      success: true,
      messages: [],
    }
  } catch (e) {
    return {
      success: false,
      error: e.message || '云数据库获取聊天记录失败',
    }
  }
}
