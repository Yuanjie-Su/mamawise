// cloudfunctions/getFavorite/index.js
/*
云平台数据库favorites表
{
  "name": "favorites",
  "description": "用户收藏的内容集合",
  "properties": {
    "_id": {
      "description": "系统自动生成的唯一ID",
      "type": "string"
    },
    "_openid": {
      "description": "用户的微信openid",
      "type": "string"
    },
    "lists": {
      "description": "收藏内容列表,object数组",
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

// 获取用户收藏的内容
// 返回lists属性中所有对象

const cloud = require('wx-server-sdk')

cloud.init({
    env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
    const wxContext = cloud.getWXContext()
    const _openid = wxContext.OPENID

    const result = await db.collection('favorites').where({
        _openid: _openid
    }).get()

    return result.data[0].lists
}   
