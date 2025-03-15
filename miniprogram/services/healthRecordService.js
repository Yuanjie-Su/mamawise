/*
 * 健康记录服务
 */

import Logger from '../utils/logger'

// 获取健康记录
async function getHealthRecords(data) {
  try {
    const result = await wx.cloud.callFunction({
      name: 'getHealthRecords',
      data: { defaultHealthRecords: data },
    })

    Logger.debug('云端健康记录', result)

    if (result && result.data) {
      return result.data
    } else {
      return data
    }
  } catch (error) {
    Logger.error('获取健康记录失败:', error)
    throw error
  }
}

export default {
  getHealthRecords,
}
