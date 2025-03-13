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

const chatHistoryCollection = db.collection('chat_history')

exports.main = async (event, context) => {
  // 获取openid
  const openid = cloud.getWXContext().OPENID

  // 获取数据库中_openid对应的记录
  const doc = await chatHistoryCollection.where({
    _openid: openid
  }).get()

  // 记录存在
  if (doc.data.length > 0) {
    return {
      lists: doc.data[0].lists,
      model_name: doc.data[0].model_name
    }
  }

  const {model_name} = event
  
  // 使用upsert保证原子性插入
  await chatHistoryCollection.upsert(
    { _openid: openid },
    { 
      lists: [],
      model_name: model_name,
    },
    { update: true, setOnInsert: true }
  );

  // 返回
  return {
    lists: [],
    model_name: model_name,
  }
}

