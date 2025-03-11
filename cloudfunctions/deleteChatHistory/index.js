// cloudfunctions/deleteChatHistory/index.js
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
  "required": ["_openid", "userQuery", "aiResponse"],
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
// 删除聊天记录，即删除lists中所有对象
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  try {
    return await db.collection('chat_history').where({
      _openid: _openid
    }).update({
      data: {
        lists: [] // 删除lists属性中所有对象
      }
    })
  } catch (e) {
    console.error(e)
    return e
  } 
}