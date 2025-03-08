/**
 * 健康记录模型
 * 定义健康记录数据结构和相关方法
 */

/**
 * 创建空的健康记录对象
 * @returns {Object} 健康记录对象
 */
function createEmptyHealthRecord() {
  return {
    dueDate: '',
    pregnancyWeek: '',
    height: '',
    prePregnancyWeight: '',
    currentWeight: '',
    bloodPressure: '',
    bloodSugar: '',
    lastCheckupDate: '',
    nextCheckupDate: '',
    notes: ''
  };
}

/**
 * 计算孕周
 * @param {String} dueDate - 预产期（格式：YYYY-MM-DD）
 * @returns {String} 孕周描述
 */
function calculatePregnancyWeek(dueDate) {
  if (!dueDate) {
    return '';
  }
  
  try {
    const dueDateObj = new Date(dueDate);
    const today = new Date();
    
    // 预产期通常是最后一次月经后的40周
    const pregnancyDuration = 40 * 7 * 24 * 60 * 60 * 1000; // 40周的毫秒数
    
    // 计算受孕日期（预产期减去40周）
    const conceptionDate = new Date(dueDateObj.getTime() - pregnancyDuration);
    
    // 计算从受孕到现在的时间差
    const timeDiff = today.getTime() - conceptionDate.getTime();
    
    // 计算孕周和天数
    const daysDiff = Math.floor(timeDiff / (24 * 60 * 60 * 1000));
    const weeks = Math.floor(daysDiff / 7);
    const days = daysDiff % 7;
    
    if (weeks < 0 || (weeks === 0 && days < 0)) {
      return '未怀孕';
    } else if (weeks >= 40) {
      return '已超过预产期';
    } else {
      return `${weeks}周${days}天`;
    }
  } catch (error) {
    console.error('计算孕周出错', error);
    return '';
  }
}

/**
 * 计算体重变化
 * @param {String|Number} preWeight - 孕前体重（kg）
 * @param {String|Number} currentWeight - 当前体重（kg）
 * @returns {String} 体重变化描述
 */
function calculateWeightChange(preWeight, currentWeight) {
  if (!preWeight || !currentWeight) {
    return '';
  }
  
  try {
    const preWeightNum = parseFloat(preWeight);
    const currentWeightNum = parseFloat(currentWeight);
    
    if (isNaN(preWeightNum) || isNaN(currentWeightNum)) {
      return '';
    }
    
    const weightChange = currentWeightNum - preWeightNum;
    const weightChangeAbs = Math.abs(weightChange).toFixed(1);
    
    if (weightChange > 0) {
      return `增加了${weightChangeAbs}kg`;
    } else if (weightChange < 0) {
      return `减少了${weightChangeAbs}kg`;
    } else {
      return '体重未变化';
    }
  } catch (error) {
    console.error('计算体重变化出错', error);
    return '';
  }
}

/**
 * 计算BMI
 * @param {String|Number} weight - 体重（kg）
 * @param {String|Number} height - 身高（cm）
 * @returns {String} BMI值和分类
 */
function calculateBMI(weight, height) {
  if (!weight || !height) {
    return '';
  }
  
  try {
    const weightNum = parseFloat(weight);
    const heightNum = parseFloat(height) / 100; // 转换为米
    
    if (isNaN(weightNum) || isNaN(heightNum) || heightNum === 0) {
      return '';
    }
    
    const bmi = (weightNum / (heightNum * heightNum)).toFixed(1);
    
    let category = '';
    if (bmi < 18.5) {
      category = '偏瘦';
    } else if (bmi < 24) {
      category = '正常';
    } else if (bmi < 28) {
      category = '偏胖';
    } else {
      category = '肥胖';
    }
    
    return `${bmi}（${category}）`;
  } catch (error) {
    console.error('计算BMI出错', error);
    return '';
  }
}

export default {
  createEmptyHealthRecord,
  calculatePregnancyWeek,
  calculateWeightChange,
  calculateBMI
}; 