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

// 获取用户健康记录表中指定属性，可能指定多种属性，以数组形式返回
// 例如：event.properties = ['weightRecords', 'bloodPressure']
// 返回：[{weightRecords: [...weightRecords]}, {bloodPressure: [...bloodPressure]}]

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const _openid = wxContext.OPENID

  const { properties } = event

  const result = await db.collection('health_records').where({
    _openid: _openid
  }).get()

  return result.data[0][properties]
}
