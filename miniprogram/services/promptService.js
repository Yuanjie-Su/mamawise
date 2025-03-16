/**
 * 提示词服务
 * 负责处理与提示词相关的功能
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'

const { CLOUD_FUNCTIONS } = appConfig

// 默认提示词-提建议
const DEFAULT_PROMPT = `你是一位专业的孕产妇健康顾问，你的职责是为孕期和产后的妈妈提供专业、温暖的健康指导和建议。
请以友善、专业的语气回答用户的问题，避免过于冰冷或机械的回复。
如果用户询问的问题超出你的知识范围或不确定的内容，请诚实告知并建议用户咨询专业医生。
\n\n
回复内容包含正文和标题。
正文不需要包含任何打招呼语句（如"您好"、"亲爱的准妈妈"等），需要通过emoji表情润色，结构清晰。
正文中每个建议尽量详细，不要过于简略。
标题简短（不超过20个字）。
\n\n回复格式要求：
正文
--- 标题
`

/**
 * 获取提示词
 * @returns {Promise<Object>} 提示词
 */
async function getPrompt() {
  try {
    const prompt = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.GET_PROMPT,
    })

    if (prompt.result.success) {
      return prompt.result.healthRecordsPrompt
    } else {
      Logger.error('云函数获取提示词失败', prompt.result.error)
      return ''
    }
  } catch (error) {
    Logger.error('promptService.getPrompt 获取提示词失败', error)
    return ''
  }
}

/**
 * 获取空的提示词
 * @returns {Object} 空的提示词
 */
function getDefaultPrompt() {
  return {
    prefix: DEFAULT_PROMPT,
    healthRecords: '',
  }
}

/**
 * 更新健康记录提示词
 * @param {String} oldPrompt - 原有的提示词
 * @param {String} updateType - 更新类型
 * @param {Object} partialRecords - 健康数据对象
 * @returns {String} 更新后的提示词
 */
function updatePartialRcordsPrompt(oldPrompt, updateType, partialRecords) {
  try {
    Logger.info('更新提示词', oldPrompt, updateType, partialRecords)
    // 获取当前的prompt对象
    let promptLines = oldPrompt.split('\n')

    // 如果提示词为空，则初始化基本结构
    if (!promptLines || promptLines.length === 0) {
      promptLines = [
        '基于用户的健康记录：',
        '',
        '最近的体征记录：',
        '',
        '当前用药：',
        '',
        '最近产检记录：',
      ]
    }

    // 根据更新类型，修改提示词的特定部分
    switch (updateType) {
      case 'pregnancyInfo':
        // 更新孕期信息
        promptLines = updatePregnancyPrompt(promptLines, partialRecords)
        break

      case 'allergyInfo':
        // 更新过敏信息
        promptLines = updateAllergyPrompt(promptLines, partialRecords)
        break

      case 'dietPreference':
        // 更新饮食偏好
        promptLines = updateDietPrompt(promptLines, partialRecords)
        break

      case 'otherInfo':
        // 更新其他信息
        promptLines = updateOtherInfoPrompt(promptLines, partialRecords)
        break

      case 'bloodPressure':
        // 更新血压记录
        promptLines = updateBloodPressurePrompt(promptLines, partialRecords)
        break

      case 'weight':
        // 更新体重记录
        promptLines = updateWeightPrompt(promptLines, partialRecords)
        break

      case 'bloodSugar':
        // 更新血糖记录
        promptLines = updateBloodSugarPrompt(promptLines, partialRecords)
        break

      case 'temperature':
        // 更新体温记录
        promptLines = updateTemperaturePrompt(promptLines, partialRecords)
        break

      case 'heartRate':
        // 更新心率记录
        promptLines = updateHeartRatePrompt(promptLines, partialRecords)
        break

      case 'fetalMovement':
        // 更新胎动记录
        promptLines = updateFetalMovementPrompt(promptLines, partialRecords)
        break

      case 'medications':
        // 更新用药记录
        promptLines = updateMedicationsPrompt(promptLines, partialRecords)
        break

      case 'checkupRecords':
        // 更新产检记录
        promptLines = updateCheckupPrompt(
          promptLines,
          partialRecords.checkupRecords,
          partialRecords.checkupAnalysis
        )
        break
      default:
        break
    }

    // 重新组合提示词
    const updatedPrompt = promptLines.join('\n')

    Logger.debug(`${updateType}提示词更新成功`)

    return updatedPrompt
  } catch (error) {
    Logger.error('更新提示词部分出错', error)
    return oldPrompt
  }
}

// 更新孕期信息
function updatePregnancyPrompt(promptLines, pregnancyInfo) {
  // 查找孕周和预产期行
  let weekLineIndex = -1
  let dueDateLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('当前孕周：')) {
      weekLineIndex = i
    } else if (promptLines[i].includes('预产期：')) {
      dueDateLineIndex = i
    }
  }

  // 生成新的孕期信息行
  const weekLine = `当前孕周：${pregnancyInfo.week || '未知'}周`
  const dueDateLine = `预产期：${pregnancyInfo.dueDate || '未知'}`

  // 如果找到了已有的行，就替换它们
  if (weekLineIndex !== -1) {
    promptLines[weekLineIndex] = weekLine
  } else {
    // 否则在基本信息部分的第一行后插入
    promptLines.splice(1, 0, weekLine)
  }

  if (dueDateLineIndex !== -1) {
    promptLines[dueDateLineIndex] = dueDateLine
  } else {
    // 找到孕周行的位置（可能是刚插入的）
    const newWeekLineIndex = promptLines.findIndex(line => line.includes('当前孕周：'))
    // 在孕周行后插入预产期行
    promptLines.splice(newWeekLineIndex + 1, 0, dueDateLine)
  }

  return promptLines
}

// 更新过敏信息
function updateAllergyPrompt(promptLines, allergyInfo) {
  // 查找过敏信息行
  let allergyLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('过敏史：')) {
      allergyLineIndex = i
      break
    }
  }

  // 生成新的过敏信息行
  const allergyLine =
    allergyInfo && allergyInfo.length > 0 ? `过敏史：${allergyInfo.join('、')}` : null

  if (allergyLine) {
    if (allergyLineIndex !== -1) {
      // 替换现有行
      promptLines[allergyLineIndex] = allergyLine
    } else {
      // 找一个合适的位置插入
      const basicInfoSection = findBasicInfoSection(promptLines)
      promptLines.splice(basicInfoSection.end, 0, allergyLine)
    }
  } else if (allergyLineIndex !== -1) {
    // 如果没有过敏信息但存在过敏行，则删除该行
    promptLines.splice(allergyLineIndex, 1)
  }

  return promptLines
}

// 更新饮食偏好
function updateDietPrompt(promptLines, dietPreference) {
  // 查找饮食偏好行
  let dietLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('饮食偏好：')) {
      dietLineIndex = i
      break
    }
  }

  // 生成新的饮食偏好行
  const dietLine =
    dietPreference && dietPreference.length > 0 ? `饮食偏好：${dietPreference.join('、')}` : null

  if (dietLine) {
    if (dietLineIndex !== -1) {
      // 替换现有行
      promptLines[dietLineIndex] = dietLine
    } else {
      // 找一个合适的位置插入
      const basicInfoSection = findBasicInfoSection(promptLines)
      promptLines.splice(basicInfoSection.end, 0, dietLine)
    }
  } else if (dietLineIndex !== -1) {
    // 如果没有饮食偏好但存在饮食行，则删除该行
    promptLines.splice(dietLineIndex, 1)
  }

  return promptLines
}

// 更新其他基本信息(年龄、身高、体重)
function updateOtherInfoPrompt(promptLines, otherInfo) {
  // 查找年龄、身高、体重行
  let ageLineIndex = -1
  let heightLineIndex = -1
  let weightLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('年龄：')) {
      ageLineIndex = i
    } else if (promptLines[i].includes('身高：')) {
      heightLineIndex = i
    } else if (promptLines[i].includes('体重：') && !promptLines[i].includes('kg (')) {
      // 避免匹配到体征记录中的体重
      weightLineIndex = i
    }
  }

  // 处理年龄行
  if (otherInfo.age) {
    const ageLine = `年龄：${otherInfo.age}岁`
    if (ageLineIndex !== -1) {
      promptLines[ageLineIndex] = ageLine
    } else {
      const basicInfoSection = findBasicInfoSection(promptLines)
      promptLines.splice(basicInfoSection.end, 0, ageLine)
    }
  } else if (ageLineIndex !== -1) {
    promptLines.splice(ageLineIndex, 1)
  }

  // 处理身高行
  if (otherInfo.height) {
    const heightLine = `身高：${otherInfo.height}cm`
    if (heightLineIndex !== -1) {
      promptLines[heightLineIndex] = heightLine
    } else {
      const ageIndex = promptLines.findIndex(line => line.includes('年龄：'))
      if (ageIndex !== -1) {
        promptLines.splice(ageIndex + 1, 0, heightLine)
      } else {
        const basicInfoSection = findBasicInfoSection(promptLines)
        promptLines.splice(basicInfoSection.end, 0, heightLine)
      }
    }
  } else if (heightLineIndex !== -1) {
    promptLines.splice(heightLineIndex, 1)
  }

  // 处理体重行
  if (otherInfo.weight) {
    const weightLine = `体重：${otherInfo.weight}kg`
    if (weightLineIndex !== -1) {
      promptLines[weightLineIndex] = weightLine
    } else {
      const heightIndex = promptLines.findIndex(line => line.includes('身高：'))
      if (heightIndex !== -1) {
        promptLines.splice(heightIndex + 1, 0, weightLine)
      } else {
        const ageIndex = promptLines.findIndex(line => line.includes('年龄：'))
        if (ageIndex !== -1) {
          promptLines.splice(ageIndex + 1, 0, weightLine)
        } else {
          const basicInfoSection = findBasicInfoSection(promptLines)
          promptLines.splice(basicInfoSection.end, 0, weightLine)
        }
      }
    }
  } else if (weightLineIndex !== -1) {
    promptLines.splice(weightLineIndex, 1)
  }

  return promptLines
}

// 更新血压记录
function updateBloodPressurePrompt(promptLines, bloodPressureRecords) {
  // 查找血压记录行
  let bpLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('血压：')) {
      bpLineIndex = i
      break
    }
  }

  // 生成新的血压记录行
  let bpLine = null
  if (bloodPressureRecords && bloodPressureRecords.length > 0) {
    const latest = bloodPressureRecords[bloodPressureRecords.length - 1]
    bpLine = `血压：${latest.value}mmHg (${latest.date})`
  }

  if (bpLine) {
    if (bpLineIndex !== -1) {
      // 替换现有行
      promptLines[bpLineIndex] = bpLine
    } else {
      // 插入到体征记录部分
      const vitalsSection = findVitalsSection(promptLines)
      promptLines.splice(vitalsSection.start + 1, 0, bpLine)
    }
  } else if (bpLineIndex !== -1) {
    // 如果没有记录但存在行，则删除该行
    promptLines.splice(bpLineIndex, 1)
  }

  return promptLines
}

// 更新体重记录
function updateWeightPrompt(promptLines, weightRecords) {
  // 查找体重记录行
  let weightLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('体重：') && promptLines[i].includes('kg (')) {
      // 确保匹配的是体征记录中的体重
      weightLineIndex = i
      break
    }
  }

  // 生成新的体重记录行
  let weightLine = null
  if (weightRecords && weightRecords.length > 0) {
    const latest = weightRecords[weightRecords.length - 1]
    weightLine = `体重：${latest.value}kg (${latest.date})`
  }

  if (weightLine) {
    if (weightLineIndex !== -1) {
      // 替换现有行
      promptLines[weightLineIndex] = weightLine
    } else {
      // 插入到体征记录部分
      const vitalsSection = findVitalsSection(promptLines)
      promptLines.splice(vitalsSection.start + 1, 0, weightLine)
    }
  } else if (weightLineIndex !== -1) {
    // 如果没有记录但存在行，则删除该行
    promptLines.splice(weightLineIndex, 1)
  }

  return promptLines
}

// 更新血糖记录
function updateBloodSugarPrompt(promptLines, bloodSugarRecords) {
  // 查找血糖记录行
  let bsLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('血糖：')) {
      bsLineIndex = i
      break
    }
  }

  // 生成新的血糖记录行
  let bsLine = null
  if (bloodSugarRecords && bloodSugarRecords.length > 0) {
    const latest = bloodSugarRecords[bloodSugarRecords.length - 1]
    bsLine = `血糖：${latest.value}mmol/L (${latest.date})`
  }

  if (bsLine) {
    if (bsLineIndex !== -1) {
      // 替换现有行
      promptLines[bsLineIndex] = bsLine
    } else {
      // 插入到体征记录部分
      const vitalsSection = findVitalsSection(promptLines)
      promptLines.splice(vitalsSection.start + 1, 0, bsLine)
    }
  } else if (bsLineIndex !== -1) {
    // 如果没有记录但存在行，则删除该行
    promptLines.splice(bsLineIndex, 1)
  }

  return promptLines
}

// 更新体温记录
function updateTemperaturePrompt(promptLines, temperatureRecords) {
  // 查找体温记录行
  let tempLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('体温：')) {
      tempLineIndex = i
      break
    }
  }

  // 生成新的体温记录行
  let tempLine = null
  if (temperatureRecords && temperatureRecords.length > 0) {
    const latest = temperatureRecords[temperatureRecords.length - 1]
    tempLine = `体温：${latest.value}°C (${latest.date})`
  }

  if (tempLine) {
    if (tempLineIndex !== -1) {
      // 替换现有行
      promptLines[tempLineIndex] = tempLine
    } else {
      // 插入到体征记录部分
      const vitalsSection = findVitalsSection(promptLines)
      promptLines.splice(vitalsSection.start + 1, 0, tempLine)
    }
  } else if (tempLineIndex !== -1) {
    // 如果没有记录但存在行，则删除该行
    promptLines.splice(tempLineIndex, 1)
  }

  return promptLines
}

// 更新心率记录
function updateHeartRatePrompt(promptLines, heartRateRecords) {
  // 查找心率记录行
  let hrLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('心率：')) {
      hrLineIndex = i
      break
    }
  }

  // 生成新的心率记录行
  let hrLine = null
  if (heartRateRecords && heartRateRecords.length > 0) {
    const latest = heartRateRecords[heartRateRecords.length - 1]
    hrLine = `心率：${latest.value}次/分 (${latest.date})`
  }

  if (hrLine) {
    if (hrLineIndex !== -1) {
      // 替换现有行
      promptLines[hrLineIndex] = hrLine
    } else {
      // 插入到体征记录部分
      const vitalsSection = findVitalsSection(promptLines)
      promptLines.splice(vitalsSection.start + 1, 0, hrLine)
    }
  } else if (hrLineIndex !== -1) {
    // 如果没有记录但存在行，则删除该行
    promptLines.splice(hrLineIndex, 1)
  }

  return promptLines
}

// 更新胎动记录
function updateFetalMovementPrompt(promptLines, fetalMovementRecords) {
  // 查找胎动记录行
  let fmLineIndex = -1

  for (let i = 0; i < promptLines.length; i++) {
    if (promptLines[i].includes('胎动：')) {
      fmLineIndex = i
      break
    }
  }

  // 生成新的胎动记录行
  let fmLine = null
  if (fetalMovementRecords && fetalMovementRecords.length > 0) {
    const latest = fetalMovementRecords[fetalMovementRecords.length - 1]
    fmLine = `胎动：${latest.value}次/小时 (${latest.date})`
  }

  if (fmLine) {
    if (fmLineIndex !== -1) {
      // 替换现有行
      promptLines[fmLineIndex] = fmLine
    } else {
      // 插入到体征记录部分
      const vitalsSection = findVitalsSection(promptLines)
      promptLines.splice(vitalsSection.start + 1, 0, fmLine)
    }
  } else if (fmLineIndex !== -1) {
    // 如果没有记录但存在行，则删除该行
    promptLines.splice(fmLineIndex, 1)
  }

  return promptLines
}

// 更新用药记录
function updateMedicationsPrompt(promptLines, medications) {
  // 查找用药记录部分的开始位置
  const medSectionStart = promptLines.findIndex(line => line.includes('当前用药'))

  if (medSectionStart === -1) {
    // 如果找不到用药记录部分，则添加一个
    promptLines.push('当前用药：')
    return promptLines
  }

  // 查找用药记录部分的结束位置
  let medSectionEnd = promptLines.findIndex(
    (line, index) => index > medSectionStart && line.includes('：') && !line.match(/^药物\d+：/)
  )

  if (medSectionEnd === -1) {
    medSectionEnd = promptLines.length
  }

  // 删除现有的用药记录行
  promptLines.splice(medSectionStart + 1, medSectionEnd - medSectionStart - 1)

  // 添加新的用药记录
  if (medications && medications.length > 0) {
    medications.forEach((med, index) => {
      const medLine =
        `药物${index + 1}：${med.name}，剂量：${med.dosage}，频率：${med.frequency}` +
        (med.startDate ? `，开始日期：${med.startDate}` : '') +
        (med.endDate ? `，结束日期：${med.endDate}` : '') +
        (med.notes ? `，备注：${med.notes}` : '')

      promptLines.splice(medSectionStart + 1 + index, 0, medLine)
    })
  }

  return promptLines
}

// 更新产检记录
function updateCheckupPrompt(promptLines, checkupRecords, checkupAnalysis) {
  // 查找产检记录部分的开始位置
  const checkupSectionStart = promptLines.findIndex(line => line.includes('最近产检记录'))

  if (checkupSectionStart === -1) {
    // 如果找不到产检记录部分，则添加一个
    promptLines.push('最近产检记录：')
    return promptLines
  }

  // 查找产检记录部分的结束位置
  let checkupSectionEnd = promptLines.findIndex(
    (line, index) =>
      index > checkupSectionStart && line.includes('：') && !line.match(/^(产检\d+|产检分析)：/)
  )

  if (checkupSectionEnd === -1) {
    checkupSectionEnd = promptLines.length
  }

  // 删除现有的产检记录行
  promptLines.splice(checkupSectionStart + 1, checkupSectionEnd - checkupSectionStart - 1)

  // 添加新的产检记录
  if (checkupRecords && checkupRecords.length > 0) {
    // 最多显示最近3条产检记录
    const recentCheckups = checkupRecords.slice(-3)

    recentCheckups.forEach((record, index) => {
      const checkupLine =
        `产检${index + 1}：${record.date}（孕${record.week}周），医院：${record.hospital}，` +
        `医生：${record.doctor}，备注：${record.notes || '无'}`

      promptLines.splice(checkupSectionStart + 1 + index, 0, checkupLine)
    })

    // 添加产检分析结果
    if (checkupAnalysis) {
      const analysisLine = `产检分析：${checkupAnalysis}`
      promptLines.splice(checkupSectionStart + 1 + recentCheckups.length, 0, analysisLine)
    }
  }

  return promptLines
}

// 查找基本信息部分的位置
function findBasicInfoSection(promptLines) {
  const start = 0 // 基本信息部分总是从第一行开始

  // 查找基本信息部分的结束位置 (下一个标题的位置)
  let end = promptLines.findIndex(
    (line, index) =>
      index > 0 &&
      line.includes('：') &&
      !line.match(/^(当前孕周|预产期|过敏史|饮食偏好|年龄|身高|体重)：/)
  )

  // 如果没有找到下一个标题，则返回数组的最后一个位置
  if (end === -1) end = promptLines.length

  return {
    start,
    end,
  }
}

// 查找体征记录部分的位置
function findVitalsSection(promptLines) {
  // 查找体征记录部分的开始位置
  const start = promptLines.findIndex(line => line.includes('最近的体征记录'))

  if (start === -1) {
    // 如果找不到体征记录标题，则使用默认顺序查找插入位置
    const basicInfoSection = findBasicInfoSection(promptLines)
    return {
      start: basicInfoSection.end,
      end: basicInfoSection.end + 1,
    }
  }

  // 查找体征记录部分的结束位置
  let end = promptLines.findIndex(
    (line, index) =>
      index > start && line.includes('：') && !line.match(/^(血压|体重|血糖|体温|心率|胎动)：/)
  )

  // 如果没有找到下一个标题，则返回数组的最后一个位置
  if (end === -1) end = promptLines.length

  return {
    start,
    end,
  }
}

// 导出函数
export default {
  getPrompt,
  updatePartialRcordsPrompt,
  getDefaultPrompt,
}
