// cloudfunctions/updateHealthRecords/index.js
/*
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

// 更新指定属性的某条记录
// 例如：event.property = 'weightRecords'
// 例如：event.index = 0
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
  const { property, index, value } = event

  try {
    return await db.collection('health_records').where({
      _openid,
      property
    } ).update({
      data: {
        // 使用动态属性名来更新指定属性数组中指定索引的元素
        [`${property}.${index}`]: value
      }
    })
  } catch (e) {
    console.error(e)
    return e
  }
} 
