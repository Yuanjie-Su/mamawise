/**
 * 消息模型
 * 定义消息数据结构和相关方法
 */

/**
 * 创建用户消息对象
 * @param {Number} id - 消息ID
 * @param {String} content - 消息内容
 * @returns {Object} 用户消息对象
 */
function createUserMessage(id, content) {
  return {
    id,
    type: 'user',
    content,
    timestamp: Date.now(),
  }
}

/**
 * 创建系统消息对象
 * @param {Number} id - 消息ID
 * @param {String} content - 消息内容
 * @returns {Object} 系统消息对象
 */
function createSystemMessage(id, content) {
  return {
    id,
    type: 'system',
    content,
    isNote: false,
    timestamp: Date.now(),
  }
}

/**
 * 更新消息内容
 * @param {Object} message - 消息对象
 * @param {String} content - 新的消息内容
 * @returns {Object} 更新后的消息对象
 */
function updateMessageContent(message, content) {
  return {
    ...message,
    content,
  }
}

export default {
  createUserMessage,
  createSystemMessage,
  updateMessageContent,
}
