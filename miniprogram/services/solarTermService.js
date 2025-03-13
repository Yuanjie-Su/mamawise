/**
 * 节气服务
 * 负责获取和管理节气信息
 */

/**
 * 获取节气信息
 * @returns {String} 当前节气名称
 */
function getSolarTermInfo() {
  const today = new Date();
  const month = today.getMonth() + 1; // 月份从0开始，需要+1
  const day = today.getDate();
  
  let solarTerm = '';
  
  if ((month === 2 && day >= 3 && day <= 5) || (month === 2 && day === 6 && today.getHours() < 12)) {
    solarTerm = '立春';
  } else if ((month === 2 && day >= 18 && day <= 20) || (month === 2 && day === 21 && today.getHours() < 12)) {
    solarTerm = '雨水';
  } else if ((month === 3 && day >= 5 && day <= 7) || (month === 3 && day === 8 && today.getHours() < 12)) {
    solarTerm = '惊蛰';
  } else if ((month === 3 && day >= 20 && day <= 22) || (month === 3 && day === 23 && today.getHours() < 12)) {
    solarTerm = '春分';
  } else if ((month === 4 && day >= 4 && day <= 6) || (month === 4 && day === 7 && today.getHours() < 12)) {
    solarTerm = '清明';
  } else if ((month === 4 && day >= 19 && day <= 21) || (month === 4 && day === 22 && today.getHours() < 12)) {
    solarTerm = '谷雨';
  } else if ((month === 5 && day >= 5 && day <= 7) || (month === 5 && day === 8 && today.getHours() < 12)) {
    solarTerm = '立夏';
  } else if ((month === 5 && day >= 20 && day <= 22) || (month === 5 && day === 23 && today.getHours() < 12)) {
    solarTerm = '小满';
  } else if ((month === 6 && day >= 5 && day <= 7) || (month === 6 && day === 8 && today.getHours() < 12)) {
    solarTerm = '芒种';
  } else if ((month === 6 && day >= 21 && day <= 23) || (month === 6 && day === 24 && today.getHours() < 12)) {
    solarTerm = '夏至';
  } else if ((month === 7 && day >= 6 && day <= 8) || (month === 7 && day === 9 && today.getHours() < 12)) {
    solarTerm = '小暑';
  } else if ((month === 7 && day >= 22 && day <= 24) || (month === 7 && day === 25 && today.getHours() < 12)) {
    solarTerm = '大暑';
  } else if ((month === 8 && day >= 7 && day <= 9) || (month === 8 && day === 10 && today.getHours() < 12)) {
    solarTerm = '立秋';
  } else if ((month === 8 && day >= 22 && day <= 24) || (month === 8 && day === 25 && today.getHours() < 12)) {
    solarTerm = '处暑';
  } else if ((month === 9 && day >= 7 && day <= 9) || (month === 9 && day === 10 && today.getHours() < 12)) {
    solarTerm = '白露';
  } else if ((month === 9 && day >= 22 && day <= 24) || (month === 9 && day === 25 && today.getHours() < 12)) {
    solarTerm = '秋分';
  } else if ((month === 10 && day >= 8 && day <= 10) || (month === 10 && day === 11 && today.getHours() < 12)) {
    solarTerm = '寒露';
  } else if ((month === 10 && day >= 23 && day <= 25) || (month === 10 && day === 26 && today.getHours() < 12)) {
    solarTerm = '霜降';
  } else if ((month === 11 && day >= 7 && day <= 9) || (month === 11 && day === 10 && today.getHours() < 12)) {
    solarTerm = '立冬';
  } else if ((month === 11 && day >= 22 && day <= 24) || (month === 11 && day === 25 && today.getHours() < 12)) {
    solarTerm = '小雪';
  } else if ((month === 12 && day >= 6 && day <= 8) || (month === 12 && day === 9 && today.getHours() < 12)) {
    solarTerm = '大雪';
  } else if ((month === 12 && day >= 21 && day <= 23) || (month === 12 && day === 24 && today.getHours() < 12)) {
    solarTerm = '冬至';
  } else if ((month === 1 && day >= 5 && day <= 7) || (month === 1 && day === 8 && today.getHours() < 12)) {
    solarTerm = '小寒';
  } else if ((month === 1 && day >= 20 && day <= 22) || (month === 1 && day === 23 && today.getHours() < 12)) {
    solarTerm = '大寒';
  }
  
  return solarTerm;
}

// 导出模块
module.exports = {
  getSolarTermInfo
}; 