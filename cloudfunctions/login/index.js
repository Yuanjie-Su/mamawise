// 登录，输入示例
// {
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

// 环境初始化
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/**
 * 登录处理核心逻辑
 * @param {Object} event - 包含code和userInfo的请求参数
 * @returns {Promise<Object>} 标准化响应格式
 */
exports.main = async (event, context) => {
  try {
    // 参数校验
    const { userInfo } = event
    // 获取openid
    const openid = cloud.getWXContext().OPENID

    // 用户数据操作
    const res = await handleUserOperation(openid, userInfo)

    return res
  } catch (error) {
    return buildErrorResponse(error)
  }
}

/* 用户数据操作核心逻辑 */
async function handleUserOperation(openid, userInfo) {
  const userCollection = db.collection('users')
  // 查询现有用户
  const userDoc = await userCollection
    .where({
      _openid: openid,
    })
    .get()

  // 用户存在时返回数据
  if (userDoc.data.length > 0) {
    return buildSuccessResponse({
      nickName: userDoc.data[0].nickName,
      avatarUrl: userDoc.data[0].avatarUrl,
    })
  }

  // 用户不存在时创建
  await userCollection.add({
    data: {
      _openid: openid,
      nickName: userInfo.nickName,
      avatarUrl: userInfo.avatarUrl,
    },
    setUnionId: false,
  })

  // 返回成功响应
  return buildSuccessResponse(userInfo)
}

/* 响应构建工具函数 */
function buildSuccessResponse(userData) {
  return {
    success: true,
    userInfo: userData,
    error: null,
  }
}

/* 错误响应构建工具函数 */
function buildErrorResponse(error) {
  let errMsg = error.message || '未知错误'

  // 错误代码映射表
  const errorCodeMap = {
    '-604100': '云函数未找到，请检查函数名称和部署状态',
    403: '权限不足，请检查云函数权限配置',
    500: '服务器内部错误，请联系管理员',
    invalid_code: '无效的code参数',
    user_not_found: '用户不存在',
  }

  if (errorCodeMap[error.code]) {
    errMsg = errorCodeMap[error.code]
  }

  return {
    success: false,
    userInfo: null,
    error: {
      code: error.code,
      message: errMsg,
    },
  }
}
