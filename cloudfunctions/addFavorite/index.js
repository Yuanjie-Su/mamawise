// cloudfunctions/addFavorite/index.js
/*
云平台数据库favorites表
{
  "name": "favorites",
  "description": "用户收藏内容集合",
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

// 添加收藏内容到favorites表的lists属性中
// 例如：event.title = '标题', event.content = '内容'
// 返回添加结果, 例如：{added: true}

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { title, content } = event
  // 将收藏内容添加到数据库原来那条记录的"lists"属性中
  // 如果数据库中没有_openid对应的记录，则创建一条记录
  try {
    const result = await db.collection('favorites').where({
      _openid: _openid
    }).get()
    if (result.data.length === 0) {
      return await db.collection('favorites').add({
        data: {
          _openid,
          lists: [{ title, content, createTime: _.serverDate() }]
        }
      })
    } else {
      return await db.collection('favorites').where({
        _openid: _openid
      }).update({
        data: {
          lists: _.push({ title, content, createTime: _.serverDate() })
        }
      })
    }
  } catch (e) {
    console.error(e)
    return e
  }
}