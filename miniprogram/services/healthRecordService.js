const callCloudFunction = async (name, data = {}) => {
  try {
    const result = await wx.cloud.callFunction({
      name,
      data
    })
    return result.result
  } catch (error) {
    console.error(`调用云函数${name}失败:`, error)
    throw error
  }
}

const healthRecordService = {
  // 获取健康记录
  getHealthRecords: async () => {
    return await callCloudFunction('getHealthRecords')
  },
  
  // 添加健康记录
  addHealthRecord: async (record) => {
    return await callCloudFunction('addHealthRecords', { record })
  },
  
  // 更新健康记录
  updateHealthRecord: async (recordId, record) => {
    return await callCloudFunction('updateHealthRecords', { recordId, record })
  },
  
  // 删除健康记录
  deleteHealthRecord: async (recordId) => {
    return await callCloudFunction('deleteHealthRecords', { recordId })
  }
}

export default healthRecordService 