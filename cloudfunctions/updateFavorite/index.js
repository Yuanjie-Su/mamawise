// cloudfunctions/updateFavorite/index.js
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

// 更新收藏内容，即更新lists中对应索引值的对象的title和content属性
// 例如：event.index = 0
// 例如：event.title = '标题'
// 例如：event.content = '内容'
// 返回更新结果, 例如：{updated: true}

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { index, title, content } = event

  try {
    return await db.collection('favorites').where({
      _openid
    }).update({
      data: {
        // 使用动态属性名来更新指定索引位置的对象
        [`lists.${index}`]: {
          title,
          content,
          createTime: _.serverDate()
        }
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
}