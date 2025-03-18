const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

exports.main = async (event, context) => {
  const openid = cloud.getWXContext().OPENID
  const { healthRecordsPrompt } = event

  try {
    const res = await db
      .collection('prompts')
      .where({
        _openid: openid,
      })
      .get()

    if (res.data.length === 0) {
      // 不存在，创建
      await db.collection('prompts').add({
        data: {
          _openid: openid,
          healthRecordsPrompt: healthRecordsPrompt,
        },
      })
    } else {
      const _id = res.data[0]._id
      if (!_id) {
        return {
          success: false,
          error: '文档ID不存在',
        }
      }

      await db
        .collection('prompts')
        .doc(_id)
        .set({
          data: {
            _openid: openid,
            healthRecordsPrompt: healthRecordsPrompt,
          },
        })
    }

    return {
      success: true,
    }
  } catch (err) {
    return {
      success: false,
      error: err,
    }
  }
}
