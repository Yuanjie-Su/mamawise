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

    if (!doc.data || doc.data.length === 0) {
      return {
        success: false,
        error: '云数据库chat_history表中没有找到_openid对应的记录',
      }
    }

    console.log('doc', doc)

    const messages = doc.data[0].messages || []

    // 检查消息是否存在
    if (!Array.isArray(messages)) {
      return {
        success: false,
        error: '消息格式不正确，无法删除',
      }
    }

    console.log('messages', messages)

    // 删除指定消息
    const filteredMessages = messages.filter(message => message.id !== messageId)

    // 更新数据库 - 确保提供了正确的data对象
    await chatHistoryCollection.doc(doc.data[0]._id).update({
      data: {
        messages: filteredMessages,
      },
    })

    return {
      success: true,
      message: '成功删除消息',
    }
  } catch (error) {
    console.error('删除消息失败:', error)
    return {
      success: false,
      error: error,
    }
  }
}
