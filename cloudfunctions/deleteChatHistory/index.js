const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const chatHistoryCollection = db.collection('chat_history')
    // 获取openid
    const openid = cloud.getWXContext().OPENID
    const { messageId } = event

    // 获取数据库中_openid对应的记录
    const doc = await chatHistoryCollection
      .where({
        _openid: openid,
      })
      .get()

    if (doc.data.length === 0) {
      return {
        success: false,
        error: '云数据库chat_history表中没有找到_openid对应的记录',
      }
    }

    const messages = doc.data[0].messages

    // 删除指定消息
    const filteredMessages = messages.filter(message => message.id !== messageId)

    // 更新数据库
    await chatHistoryCollection.doc(doc.data[0]._id).update({
      messages: filteredMessages,
    })

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: error,
    }
  }
}
