// cloudfunctions/addChatHistory/index.js
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

// 添加聊天记录到数据库chat_history表的messages属性中
// 每次添加一个对象，user_message或者system_message
// user_message:{id:1,type:'user',content:'你好'}
// system_message:{id:2,type:'system',content:'你好', isFavorite:false}
// 例如：event.recentMessages = [{id:1,type:'user',content:'你好'}]
// 例如：event.recentMessages = [{id:2,type:'system',content:'你好', isFavorite:false}]

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

// 辅助函数：将数组分块
function chunkArray(array, chunkSize) {
  const result = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { messagesToSave } = event

  // 将回复内容添加到数据库原来那条记录的"messages"属性中
  // 如果数据库中没有_openid对应的记录，则创建一条记录
  try {
    const result = await db
      .collection('chat_history')
      .where({
        _openid: openid,
      })
      .get()

    if (result.data.length === 0) {
      return await db.collection('chat_history').add({
        data: {
          _openid: openid,
          messages: messagesToSave,
        },
      })
    } else {
      const chunkSize = 10
      const chunks = chunkArray(messagesToSave, chunkSize)
      for (const chunk of chunks) {
        await db
          .collection('chat_history')
          .where({
            _openid: openid,
          })
          .update({
            data: {
              messages: _.push(chunk),
            },
          })
      }
    }

    return {
      success: true,
      message: '云数据库添加聊天记录成功',
    }
  } catch (e) {
    console.error(e)
    return {
      success: false,
      error: e.message || '云数据库添加聊天记录失败',
    }
  }
}
