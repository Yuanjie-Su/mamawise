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
    "lists": {
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

// 添加聊天记录到数据库chat_history表的lists属性中
// 每次添加一个对象，user_message或者system_message
// user_message:{id:1,type:'user',content:'你好'}
// system_message:{id:2,type:'system',content:'你好', isFavorite:false}
// 例如：event.message = {id:1,type:'user',content:'你好'}
// 例如：event.message = {id:2,type:'system',content:'你好', isFavorite:false}

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  // 将回复内容添加到数据库原来那条记录的"lists"属性中
  // 如果数据库中没有_openid对应的记录，则创建一条记录
  try {
    const result = await db.collection('chat_history').where({
      _openid: _openid
    }).get()
    if (result.data.length === 0) {
      return await db.collection('chat_history').add({
        data: {
          _openid,
          lists: [event.message]
        }
      })
    } else {  
      return await db.collection('chat_history').where({
        _openid: _openid
      }).update({
        data: {
          lists: _.push(event.message)
        }
      })
    }
  } catch (e) {
    console.error(e)
    return e
  }
}