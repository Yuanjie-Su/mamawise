// cloudfunctions/addHealthRecord/index.js
/*
云平台数据库health_records表
{
  "name": "health_records",
  "description": "用户健康记录集合",
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
    "dueDate": {
      "description": "预产期，格式YYYY-MM-DD",
      "type": "string",
      "default": ""
    },
    "pregnancyWeek": {
      "description": "孕周数",
      "type": "number",
      "default": -1
    },
    "height": {
      "description": "身高，单位cm",
      "type": "number",
      "default": -1
    },
    "prePregnancyWeight": {
      "description": "孕前体重，单位kg",
      "type": "number",
      "default": -1
    },
    "weightRecords": {
      "description": "体重记录",
      "type": "array",
      "default": []
    },
    "bloodPressure": {
      "description": "血压记录",
      "type": "array",
      "default": []
    },
    "bloodSugar": {
      "description": "血糖记录",
      "type": "array",
      "default": []
    },
    "fetalMovement": {
      "description": "胎动记录",
      "type": "array",
      "default": []
    },
    "heartRate": {
      "description": "心率记录",
      "type": "array",
      "default": []
    },
    "temperature": {
      "description": "体温记录",
      "type": "array",
      "default": []
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

// 向指定属性添加值
// 例如：event.property = 'weightRecords'
// 例如：event.value = {weight: 60, date: '2024-01-01'}

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID
  const {property, value} = event

  try {
    // 向指定属性添加值
    // 如果数据库中没有_openid对应的记录，则创建一条记录  
    const result = await db.collection('health_records').where({
      _openid: _openid
    }).get()
    if (result.data.length === 0) {
      return await db.collection('health_records').add({
        data: {
          _openid,
          [property]: [value]
        }
      })
    } else {
      return await db.collection('health_records').where({
        _openid: _openid
      }).update({
        data: {
          [property]: _.push(value)
        }
      })
    } 
  } catch (e) {
    console.error(e)
    return e
  }
}