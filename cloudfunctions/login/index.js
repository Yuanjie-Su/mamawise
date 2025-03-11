// 登录，输入示例
// {
//   "code": "00111111111111111111111111111111"
//   "userInfo": {
//     "nickName": "张三",
//     "avatarUrl": "https://wx.qlogo.cn/mmopen/vi_32/DYAIOgq83eqTq60WK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQ/132"
//   }
// }
// 数据库中没有_openid对应的记录，返回传入的userInfo；否则返回数据库中的userInfo
// 返回示例
// {
//   "success": true,
//   "userInfo": {
//     "nickName": "张三",
//     "avatarUrl": "https://wx.qlogo.cn/mmopen/vi_32/DYAIOgq83eqTq60WK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQK6wQ/132"
//   }
//   "error": null
// }

const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

exports.main = async (event, context) => {
  try {
    const loginRes = await cloud.openapi.login(event.code)
    if (!loginRes || !loginRes.openid) {
      throw new Error('登录失败：无效的code参数')
    }
    const openid = loginRes.openid

    // 权限校验中间件
    if (context.auth && context.auth.openid !== openid) {
      throw new Error('权限不足：只能操作自己的数据')
    }

    const userCollection = db.collection('users')

    const user = await userCollection.where({
      _openid: openid
    }).get()

    if (user.data.length === 0) {
      // 用户不存在，创建新用户
      await userCollection.add({
        data: {
          _openid: openid,
          nickName: event.userInfo.nickName,
          avatarUrl: event.userInfo.avatarUrl,
        }
      })
    }

    const userInfo = user.data[0]

    return {
      success: true,
      userInfo: userInfo,
      error: null
    }
  } catch (error) {
    return {
      success: false,
      userInfo: null,
      error: error.message || '未知错误'
    }
  }
}