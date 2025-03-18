const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { updateType, partialRecords } = event

  try {
    const res = await db.collection('health_records').where({ _openid: openid }).get()
    if (res.data.length > 0) {
      const existingData = res.data[0] || {} // 获取原数据

      const { _id, ...dataWithoutId } = existingData

      if (!_id) {
        return {
          success: false,
          error: '文档ID不存在',
        }
      }

      // 已有数据，更新
      if (updateType in dataWithoutId) {
        // 字段存在，更新
        await db
          .collection('health_records')
          .doc(_id)
          .update({
            data: {
              [updateType]: partialRecords,
            },
          })
      } else {
        // 字段不存在，新增
        await db
          .collection('health_records')
          .doc(_id)
          .set({
            data: {
              ...dataWithoutId,
              [updateType]: partialRecords,
            },
          })
      }
    } else {
      // 不存在openid，创建新记录
      await db.collection('health_records').add({
        data: {
          _openid: openid,
          [updateType]: partialRecords,
        },
      })
    }

    return {
      success: true,
    }
  } catch (e) {
    return {
      success: false,
      error: e,
    }
  }
}
