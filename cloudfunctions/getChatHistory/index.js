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
// 获取聊天记录，即获取 lists属性中所有对象
// 返回lists属性中所有对象  

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  // 获取数据库中_openid对应的记录
  const result = await db.collection('chat_history').where({
    _openid: _openid
  }).get()

  // 返回lists属性中所有对象
  return result.data[0].lists
}

