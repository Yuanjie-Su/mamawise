/* 云数据库prompts表结构
{
  "name": "prompts",
  "description": "提示词集合",
  "properties": {
    "_id": {
      "description": "系统自动生成的唯一ID",
      "type": "string"
    },
    "_openid": {
      "description": "用户的微信openid",
      "type": "string"
    },
    "prompt": {
      "description": "提示词",
      "type": "object",
      "default": {}
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

// 获取提示词
// 返回：提示词对象，示例：{
//   "recommended_questions": "基于以下聊天历史，生成3个用户可能想继续问的问题。
// 这些问题应该与孕期健康、胎儿发育、产后护理或相关话题有关，并且与聊天内容紧密相关。
// 只返回问题，每行一个，不要有编号或其他格式。\n\n
// 聊天历史：\n用户：你好，我怀孕了，最近感觉很累，有什么需要注意的吗？\n
// AI：您好，怀孕期间感到疲劳是很常见的，建议您多休息，保持良好的饮食习惯，并定期进行产检。"
// }

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

const promptsCollection = db.collection('prompts')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  try {
    const result = await promptsCollection.where({
      _openid: _openid,
    }).get()
    return result.data[0]?.prompt ?? {}
  } catch (error) {
    return { 
      code: 500,
      message: '获取提示词失败，请稍后再试',
      error: error.message
    }
  }
}
