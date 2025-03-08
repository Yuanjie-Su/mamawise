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
    timestamp: Date.now()
  };
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
    timestamp: Date.now()
  };
}

/**
 * 创建空的系统消息对象（用于流式响应）
 * @param {Number} id - 消息ID
 * @returns {Object} 空的系统消息对象
 */
function createEmptySystemMessage(id) {
  return createSystemMessage(id, '');
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
    content
  };
}

/**
 * 获取消息时间戳的格式化字符串
 * @param {Object} message - 消息对象
 * @returns {String} 格式化的时间字符串
 */
function getFormattedTime(message) {
  const date = new Date(message.timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

export default {
  createUserMessage,
  createSystemMessage,
  createEmptySystemMessage,
  updateMessageContent,
  getFormattedTime
}; 