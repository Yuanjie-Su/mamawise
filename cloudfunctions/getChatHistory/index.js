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
    "model_name": {
      "description": "AI模型名称",
      "type": "string",
      "default": "DeepSeek-v3"
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
// 获取聊天记录
// 返回lists属性和model_name属性

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  // 获取数据库中_openid对应的记录
  const result = await db.collection('chat_history').where({
    _openid: _openid
  }).get()

  // 返回lists属性和model_name属性
  return {
    lists: result.data[0].lists,
    model_name: result.data[0].model_name
  }
}

