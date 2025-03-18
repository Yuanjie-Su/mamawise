/**
 * 文件工具模块
 * 处理文件上传、压缩等功能
 */

import Logger from './logger'

/**
 * 压缩图片
 * @param {string} filePath - 图片路径
 * @param {number} quality - 图片质量(0-100)
 * @param {number} compressedWidth - 压缩后的宽度
 * @returns {Promise<string>} 压缩后的临时文件路径
 */
async function compressImage(filePath, quality = 80, compressedWidth = 200) {
  try {
    // 检查输入参数
    if (!filePath) {
      throw new Error('文件路径不能为空')
    }

    const result = await new Promise((resolve, reject) => {
      wx.compressImage({
        src: filePath,
        quality,
        compressedWidth,
        success: resolve,
        fail: reject,
      })
    })

    return result.tempFilePath
  } catch (error) {
    // 如果是用户取消操作，不视为错误
    if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
      Logger.info('用户取消图片压缩操作')
      throw error // 仍然抛出错误，但上层可以识别并处理
    }

    Logger.error('压缩图片失败', error)
    throw error
  }
}

/**
 * 上传文件到云存储
 * @param {string} cloudPath - 云存储路径
 * @param {string} filePath - 本地文件路径
 * @returns {Promise<string>} 文件ID
 */
async function uploadToCloud(cloudPath, filePath) {
  try {
    const result = await wx.cloud.uploadFile({
      cloudPath,
      filePath,
    })
    return result.fileID
  } catch (error) {
    Logger.error('上传文件失败', error)
    throw error
  }
}

/**
 * 处理并上传用户头像
 * @param {string} tempFilePath - 临时文件路径
 * @param {string} openid - 用户openid
 * @returns {Promise<string>} 云存储文件ID
 */
async function processAndUploadAvatar(tempFilePath, openid) {
  try {
    // 1. 压缩图片
    const compressedPath = await compressImage(tempFilePath)

    // 2. 生成云存储路径
    const cloudPath = `mamawise/miniprogram/images/user_avatar/${
      openid || 'user'
    }_${new Date().getTime()}.png`

    // 3. 上传到云存储
    const fileID = await uploadToCloud(cloudPath, compressedPath)

    return fileID
  } catch (error) {
    Logger.error('处理并上传头像失败', error)
    throw error
  }
}

export default {
  compressImage,
  uploadToCloud,
  processAndUploadAvatar,
}
