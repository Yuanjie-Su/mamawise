// cloudfunctions/deleteFavorite/index.js
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

// 删除收藏内容，即删除lists中对应索引值的对象
// 例如：event.index = 0
// 返回删除结果, 例如：{deleted: true}

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const { index } = event

  try {
    // 查询对应_openid的文档，并获取lists数组
    const res = await db.collection('favorites').where({
      _openid: _openid
    }).field({
      lists: true
    }).get();

    if (res.data.length === 0) {
      return { deleted: false };
    }

    const lists = res.data[0].lists;
    // 移除指定索引的元素
    if (index >= 0 && index < lists.length) {
      lists.splice(index, 1);
    } else {
      return { deleted: false };
    }

    // 更新数据库中的lists数组
    const updateRes = await db.collection('favorites').where({
      _openid: _openid
    }).update({
      data: {
        lists: lists
      }
    });

    return { deleted: updateRes.stats.updated > 0 };
  } catch (e) {
    console.error(e)
    return e
  }
}