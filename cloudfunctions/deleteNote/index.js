const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { id } = event

  try {
    // 检查用户是否存在
    const docRes = await db
      .collection('notes')
      .where({
        _openid: openid,
      })
      .get()

    if (docRes.data.length === 0) {
      return {
        success: false,
        error: '笔记不存在',
      }
    }

    const docData = docRes.data[0]
    let lists = docData.lists || []

    // 过滤掉要删除的笔记
    lists = lists.filter(note => note.id !== id)

    // 更新数据库中的笔记列表
    await db
      .collection('notes')
      .where({
        _openid: openid,
      })
      .update({
        data: {
          lists,
        },
      })

    return {
      success: true,
      message: '笔记已删除',
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || '删除笔记失败',
    }
  }
}
