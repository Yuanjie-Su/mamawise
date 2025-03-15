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
    "pregnancyInfo": {
      "description": "怀孕信息",
      "type": "object"
    },
    "allergyInfo": {
      "description": "过敏信息",
      "type": "array"
    },
    "dietPreference": {
      "description": "饮食偏好",
      "type": "array"
    },
    "otherInfo": {
      "description": "其他信息",
      "type": "string"
    },
    "bloodPressureRecords": {
      "description": "血压记录",
      "type": "array"
    },
    "weightRecords": {
      "description": "体重记录",
      "type": "array"
    },
    "bloodSugarRecords": {
      "description": "血糖记录",
      "type": "array"
    },
    "temperatureRecords": {
      "description": "体温记录",
      "type": "array"
    },
    "heartRateRecords": {
      "description": "心率记录",
      "type": "array"
    },
    "fetalMovementRecords": {
      "description": "胎动记录",
      "type": "array"
    },
    "medications": {
      "description": "用药记录",
      "type": "array"
    },
    "checkupRecords": {
      "description": "检查记录",
      "type": "array"
    },
    "checkupAnalysis": {
      "description": "检查分析",
      "type": "string"
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

// 获取用户健康记录

const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const healthRecordsCollection = db.collection('health_records')

exports.main = async (event, context) => {
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID

    const { defaultHealthRecords } = event

    const doc = await healthRecordsCollection
      .where({
        _openid: openid,
      })
      .get()

    // 不存在则创建
    if (doc.data.length === 0) {
      await healthRecordsCollection.add({
        data: {
          _openid: openid,
          ...defaultHealthRecords,
        },
        setUnionId: false,
      })
      return {
        success: true,
        data: defaultHealthRecords,
      }
    } else {
      return {
        success: true,
        // 返回去除_id和_openid的data
        data: {
          ...doc.data[0],
          _id: undefined,
          _openid: undefined,
        },
      }
    }
  } catch (e) {
    console.error('获取健康记录失败:', e)
    return {
      success: false,
      data: defaultHealthRecords,
      error: e.message,
    }
  }
}
