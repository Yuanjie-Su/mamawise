const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID

  const db = cloud.database()

  try {
    await db
      .collection('users')
      .where({
        _openid: openid,
      })
      .update({
        data: {
          [event.property]: event.value,
        },
      })

    return {
      success: true,
      error: null,
    }
  } catch (e) {
    // 处理错误类型
    let errorMessage = '更新失败'
    let errorCode = 500

    if (e.code === 'DATABASE_ERROR') {
      errorMessage = '数据库操作失败'
      errorCode = 400
    } else if (e.code === 'NETWORK_ERROR') {
      errorMessage = '网络连接失败'
      errorCode = 503
    }

    // 开发环境下保留完整错误信息
    const errorDetails = process.env.NODE_ENV === 'development' ? { stack: e.stack } : null

    return {
      success: false,
      error: {
        message: errorMessage,
        code: errorCode,
        details: errorDetails,
      },
    }
  }
}
