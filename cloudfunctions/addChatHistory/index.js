const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()
const _ = db.command

// 辅助函数：将数组分块
function chunkArray(array, chunkSize) {
  const result = []
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize))
  }
  return result
}

exports.main = async (event, context) => {
  // 将回复内容添加到数据库原来那条记录的"messages"属性中
  // 如果数据库中没有_openid对应的记录，则创建一条记录
  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID
    const {
      messagesToSave
    } = event
    const result = await db
      .collection('chat_history')
      .where({
        _openid: openid,
      })
      .get()

    if (result.data.length === 0) {
      // 创建新的聊天记录
      await db.collection('chat_history').add({
        data: {
          _openid: openid,
          messages: messagesToSave,
        },
      })
      return {
        success: true,
        message: '云数据库创建新聊天记录成功',
      }
    } else {
      const chunkSize = 10
      const chunks = chunkArray(messagesToSave, chunkSize)
      for (const chunk of chunks) {
        await db
          .collection('chat_history')
          .where({
            _openid: openid,
          })
          .update({
            data: {
              messages: _.push(chunk),
            },
          })
      }
    }

    return {
      success: true,
      message: '云数据库添加聊天记录成功',
    }
  } catch (e) {
    return {
      success: false,
      error: e.message || '云数据库添加聊天记录失败',
    }
  }
}