const cloud = require('wx-server-sdk')

// 环境初始化
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

/**
 * 登录处理核心逻辑
 * @param {Object} event - 包含userInfo的请求参数
 * @returns {Object} 标准化响应格式
 */
exports.main = async (event, context) => {
  try {
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
  // 并发获取users表中用户信息、healthRecords表中健康记录、prompts表中提示词、chatHistory表中聊天记录
  return Promise.all([
    // 用户表操作
    db
      .collection('users')
      .where({
        _openid: openid,
      })
      .get()
      .then(res => {
        if (res.data.length === 0) {
          // 不存在，注册用户
          return db
            .collection('users')
            .add({
              data: {
                _openid: openid,
                ...userInfo,
              },
            })
            .then(res => {
              return userInfo
            })
        } else {
          // 返回用户昵称和头像
          return {
            nickName: res.data[0].nickName,
            avatarUrl: res.data[0].avatarUrl,
          }
        }
      })
      .then(result => {
        return result
      }),

    // 聊天记录表操作
    db
      .collection('chat_history')
      .where({
        _openid: openid,
      })
      .get()
      .then(res => {
        if (res.data.length === 0) {
          return null
        } else {
          const messages = res.data[0].messages
          if (messages.length > 200) {
            return messages.slice(-200)
          } else {
            return messages
          }
        }
      })
      .then(result => {
        return result
      }),

    // 提示词表操作
    db
      .collection('prompts')
      .where({
        _openid: openid,
      })
      .get()
      .then(res => {
        if (res.data.length === 0) {
          return null
        } else {
          // 返回除openid、id外的数据
          return res.data[0].healthRecordsPrompt
        }
      })
      .then(result => {
        return result
      }),

    // 健康记录表操作（批量插入默认数据）
    db
      .collection('health_records')
      .where({
        _openid: openid,
      })
      .get()
      .then(res => {
        if (res.data.length === 0) {
          return null
        } else {
          // 返回除openid、id外的数据
          return Object.fromEntries(
            Object.entries(res.data[0]).filter(([key]) => key !== '_openid' && key !== '_id')
          )
        }
      })
      .then(result => {
        return result
      }),

    // 收藏夹表操作
    db
      .collection('notes')
      .where({
        _openid: openid,
      })
      .get()
      .then(res => {
        if (res.data.length === 0) {
          return null
        } else {
          const lists = res.data[0].lists
          if (lists.length > 50) {
            return lists.slice(-50)
          } else {
            return lists
          }
        }
      })
      .then(result => {
        return result
      }),
  ])
    .then(results => {
      // 返回成功响应
      return buildSuccessResponse({
        userInfo: results[0],
        chatHistory: results[1],
        healthRecordsPrompt: results[2],
        healthRecords: results[3],
        notes: results[4],
      })
    })
    .catch(err => {
      return buildErrorResponse(err)
    })
}

/* 响应构建工具函数 */
function buildSuccessResponse(data) {
  return {
    success: true,
    data: data,
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
    data: null,
    error: {
      code: error.code,
      message: errMsg,
    },
  }
}
