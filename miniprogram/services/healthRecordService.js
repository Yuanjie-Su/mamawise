/*
 * 健康记录服务
 */

import Logger from '../utils/logger'

// 获取健康记录
async function getHealthRecords(data) {
  try {
    const res = await wx.cloud.callFunction({
      name: 'getHealthRecords',
      data: { defaultHealthRecords: data },
    })

    Logger.debug('云端健康记录', res)

    if (res && res.data) {
      return res.data
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
