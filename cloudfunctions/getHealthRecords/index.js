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

    const {
      defaultHealthRecords
    } = event

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