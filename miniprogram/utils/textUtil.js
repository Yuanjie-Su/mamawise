/**
 * 文本工具模块
 * 提供文本处理相关的工具函数
 */

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @param {string} format - 格式化模板，默认为yyyy-MM-dd HH:mm
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'yyyy-MM-dd HH:mm') {
  if (!date) {
    return ''
  }

  // 如果传入的是字符串，则转换为日期对象
  if (typeof date === 'string') {
    date = new Date(date.replace(/-/g, '/'))
  }

  // 确保date是Date对象
  if (!(date instanceof Date)) {
    return ''
  }

  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')

  let formatted = format
    .replace('yyyy', year)
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('dd', day)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('hh', hours)
    .replace('mm', minutes)
    .replace('ss', seconds)

  return formatted
}

/**
 * 获取当前日期
 * @param {String} format - 格式模板，如 'yyyy-MM-dd'
 * @returns {String} 当前日期的格式化字符串
 */
function getCurrentDate(format = 'yyyy-MM-dd') {
  return formatDate(new Date(), format)
}

/**
 * 从内容中提取标题和正文
 * @param {string} content - 原始内容
 * @param {Object} options - 配置选项
 * @returns {Object} 包含title和content的对象
 */
function extractTitleAndContent(content, options = {}) {
  const { defaultTitle = '笔记内容', separator = '---', maxTitleLength = 50 } = options

  let title = defaultTitle
  let contentProcessed = content

  if (!content) {
    return { title, content: '' }
  }

  if (content.includes(separator)) {
    const parts = content.split(separator)
    if (parts.length >= 2) {
      const possibleTitle = parts[parts.length - 1].trim()
      if (possibleTitle && possibleTitle.length <= maxTitleLength) {
        title = possibleTitle
        contentProcessed = parts
          .slice(0, parts.length - 1)
          .join(separator)
          .trim()
      }
    }
  }

  return { title, content: contentProcessed }
}

/**
 * 截断文本
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @param {string} suffix - 截断后的后缀，默认为...
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text
  }
  return text.substring(0, maxLength) + suffix
}

/**
 * 剔除文本中的HTML标签
 * @param {string} html - 包含HTML标签的文本
 * @returns {string} 剔除HTML标签后的纯文本
 */
function stripHtml(html) {
  if (!html) {
    return ''
  }
  return html.replace(/<[^>]*>/g, '')
}

/**
 * 生成随机ID
 * @param {number} length - ID长度
 * @returns {string} 随机ID
 */
function generateRandomId(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  const charactersLength = characters.length
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength))
  }
  return result
}

/**
 * 格式化数字，保留指定小数位
 * @param {number} num - 要格式化的数字
 * @param {number} digits - 小数位数
 * @returns {string} 格式化后的数字字符串
 */
function formatNumber(num, digits = 2) {
  if (isNaN(num)) return '0'
  return Number(num).toFixed(digits)
}

/**
 * 将毫秒数转换为友好的时间格式
 * @param {number} ms - 毫秒数
 * @returns {string} 友好的时间格式
 */
function formatTimeFromMs(ms) {
  if (!ms) return '0秒'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}天${hours % 24}小时`
  if (hours > 0) return `${hours}小时${minutes % 60}分钟`
  if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`
  return `${seconds}秒`
}

export default {
  formatDate,
  getCurrentDate,
  extractTitleAndContent,
  truncateText,
  stripHtml,
  generateRandomId,
  formatNumber,
  formatTimeFromMs,
}
