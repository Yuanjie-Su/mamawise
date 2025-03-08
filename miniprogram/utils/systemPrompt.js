/**
 * 系统提示词生成模块
 * 用于构建与AI模型对话时的系统提示词
 */

/**
 * 构建系统提示词
 * @param {Object} data - 包含用户信息、天气信息等数据
 * @returns {String} 构建好的系统提示词
 */
function buildSystemPrompt(data) {
  const {
    isLoggedIn,
    hasPersonalInfo,
    healthRecords,
    weatherInfo,
    solarTermInfo
  } = data;

  let systemPrompt = `你是一位专业的AI助手，名为"妈妈智慧"。你的任务是为孕期和产后妈妈提供准确、科学的健康建议和知识。
请根据用户的问题，提供简洁明了的回答，避免过长的内容。
回答应当基于医学共识和科学研究，避免提供有争议的建议。
如果用户询问的问题超出你的能力范围或需要专业医疗诊断，请建议用户咨询医生。
请使用友善、温暖的语气，避免使用过于专业的医学术语，确保普通用户能够理解。`

  // 添加天气和节气信息
  systemPrompt += `\n\n今日环境信息：
- 天气：${weatherInfo.description}，${weatherInfo.temperature}°C
- 节气：${solarTermInfo}`

  // 如果用户已登录且已完善个人信息，添加个性化信息
  if (isLoggedIn && hasPersonalInfo && healthRecords) {
    const records = healthRecords;
    
    // 添加基本孕期信息
    systemPrompt += `\n\n用户当前信息：`;
    
    if (records.pregnancy) {
      if (records.pregnancy.week) {
        systemPrompt += `\n- 孕周：${records.pregnancy.week}周`;
      }
      if (records.pregnancy.dueDate) {
        systemPrompt += `\n- 预产期：${records.pregnancy.dueDate}`;
      }
      // 添加末次产检信息（如果有）
      if (records.pregnancy.lastCheckup) {
        systemPrompt += `\n- 最近一次产检：${records.pregnancy.lastCheckup}`;
      }
    }

    // 添加体征信息
    if (records.vitals) {
      // 血压记录
      if (records.vitals.bloodPressure && records.vitals.bloodPressure.length > 0) {
        const latestBP = records.vitals.bloodPressure[0];
        systemPrompt += `\n- 最近血压：${latestBP.value} mmHg (${latestBP.date})`;
      }
      
      // 体重记录
      if (records.vitals.weight && records.vitals.weight.length > 0) {
        const latestWeight = records.vitals.weight[0];
        systemPrompt += `\n- 最近体重：${latestWeight.value}kg (${latestWeight.date})`;
      }
      
      // 血糖记录
      if (records.vitals.bloodSugar && records.vitals.bloodSugar.length > 0) {
        const latestBS = records.vitals.bloodSugar[0];
        systemPrompt += `\n- 最近血糖：${latestBS.value} mmol/L (${latestBS.date})`;
      }
      
      // 体温记录
      if (records.vitals.temperature && records.vitals.temperature.length > 0) {
        const latestTemp = records.vitals.temperature[0];
        systemPrompt += `\n- 最近体温：${latestTemp.value}°C (${latestTemp.date})`;
      }
      
      // 心率记录
      if (records.vitals.heartRate && records.vitals.heartRate.length > 0) {
        const latestHR = records.vitals.heartRate[0];
        systemPrompt += `\n- 最近心率：${latestHR.value} bpm (${latestHR.date})`;
      }
      
      // 胎动记录
      if (records.vitals.fetalMovement && records.vitals.fetalMovement.length > 0) {
        const latestFM = records.vitals.fetalMovement[0];
        systemPrompt += `\n- 最近胎动：${latestFM.value} 次/小时 (${latestFM.date})`;
      }
    }
    
    // 添加过敏信息
    if (records.allergies && records.allergies.length > 0) {
      systemPrompt += `\n- 过敏史：${records.allergies.join(', ')}`;
    }
    
    // 添加饮食偏好信息
    if (records.dietPreferences && records.dietPreferences.length > 0) {
      systemPrompt += `\n- 饮食偏好：${records.dietPreferences.join(', ')}`;
    }
    
    // 添加用药信息
    if (records.medications && records.medications.length > 0) {
      const medicationInfo = records.medications.map(med => {
        let info = `${med.name}`;
        if (med.dosage) info += ` ${med.dosage}`;
        if (med.frequency) info += ` ${med.frequency}`;
        if (med.time) info += ` ${med.time}`;
        return info;
      }).join('; ');
      systemPrompt += `\n- 当前用药：${medicationInfo}`;
    }
    
    // 添加产检记录信息
    if (records.checkupRecords && records.checkupRecords.length > 0) {
      const latestCheckup = records.checkupRecords[0];
      systemPrompt += `\n- 最近产检：${latestCheckup.date} (孕${latestCheckup.week}周) 在${latestCheckup.hospital}`;
      
      // 如果有医嘱，也添加进去
      if (latestCheckup.notes) {
        systemPrompt += `\n- 医嘱：${latestCheckup.notes}`;
      }
    }
    
    // 添加产检记录分析信息
    if (records.checkupAnalysis) {
      systemPrompt += `\n- 产检记录分析：${records.checkupAnalysis}`;
    }
    
    systemPrompt += `\n\n请根据用户的健康记录提供个性化的建议。特别注意用户的过敏史和饮食偏好，在提供饮食建议时避免推荐用户过敏的食物，并尊重用户的饮食偏好。同时，考虑当前的天气和节气情况，提供更加适合的健康建议。

根据用户的孕周，提供针对性的孕期保健建议。如果用户有异常的体征数据（如血压、血糖等），请特别关注并给予相应的建议，但不要引起用户的恐慌。

如果用户正在服用药物，请在提供建议时考虑药物的影响，避免可能的药物相互作用。`;
  } else {
    // 如果用户未登录或未完善个人信息，也添加天气和节气相关建议
    systemPrompt += `\n\n请在回答用户问题时，适当考虑当前的天气和节气情况，提供更加贴合实际环境的健康建议。由于用户尚未登录或未完善个人信息，请提供通用的孕期和产后健康建议，并鼓励用户完善个人信息以获取更加个性化的建议。`;
  }
  
  return systemPrompt;
}

module.exports = {
  buildSystemPrompt
}; 