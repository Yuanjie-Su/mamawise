/**
 * 工具函数库
 */

/**
 * 格式化日期
 * @param {Date|String} date - 日期对象或日期字符串
 * @param {String} format - 格式模板，如 'YYYY-MM-DD'
 * @returns {String} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  if (!date) return '';
  
  // 如果传入的是字符串，则转换为日期对象
  if (typeof date === 'string') {
    date = new Date(date.replace(/-/g, '/'));
  }
  
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = date.getHours();
  const minute = date.getMinutes();
  const second = date.getSeconds();
  
  // 替换格式模板中的占位符
  return format
    .replace('YYYY', year)
    .replace('MM', month < 10 ? '0' + month : month)
    .replace('DD', day < 10 ? '0' + day : day)
    .replace('HH', hour < 10 ? '0' + hour : hour)
    .replace('mm', minute < 10 ? '0' + minute : minute)
    .replace('ss', second < 10 ? '0' + second : second);
}

/**
 * 获取当前日期
 * @param {String} format - 格式模板，如 'YYYY-MM-DD'
 * @returns {String} 当前日期的格式化字符串
 */
function getCurrentDate(format = 'YYYY-MM-DD') {
  return formatDate(new Date(), format);
}

// 导出函数
export {
  formatDate,
  getCurrentDate
}; 