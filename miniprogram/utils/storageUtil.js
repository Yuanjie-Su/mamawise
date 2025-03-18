/**
 * 存储工具模块
 * 对wx.storage操作进行封装，提供Promise接口
 */

import Logger from './logger'

/**
 * 获取存储项
 * @param {string} key - 存储键
 * @param {any} defaultValue - 默认值，当获取失败时返回
 * @returns {Promise<any>} 存储的值
 */
async function getStorage(key, defaultValue = null) {
  try {
    const result = await wx.getStorage({ key })
    Logger.debug(`获取存储项: ${key}`, result)
    return result.data || defaultValue
  } catch (error) {
    Logger.debug(`获取存储项失败: ${key}`, error)
    return defaultValue
  }
}

/**
 * 设置存储项
 * @param {string} key - 存储键
 * @param {any} data - 要存储的数据
 * @returns {Promise<void>}
 */
async function setStorage(key, data) {
  try {
    await wx.setStorage({ key, data })
  } catch (error) {
    Logger.error(`设置存储项失败: ${key}`, error)
    throw error
  }
}

/**
 * 批量设置存储项
 * @param {Array<{key: string, data: any}>} items - 要存储的项
 * @returns {Promise<void>}
 */
async function batchSetStorage(items) {
  try {
    await Promise.all(items.map(item => wx.setStorage({ key: item.key, data: item.data })))
  } catch (error) {
    Logger.error('批量设置存储项失败', error)
    throw error
  }
}

/**
 * 删除存储项
 * @param {string} key - 存储键
 * @returns {Promise<void>}
 */
async function removeStorage(key) {
  try {
    await wx.removeStorage({ key })
  } catch (error) {
    Logger.error(`删除存储项失败: ${key}`, error)
    throw error
  }
}

/**
 * 清除所有存储
 * @returns {Promise<void>}
 */
async function clearStorage() {
  try {
    await wx.clearStorage()
  } catch (error) {
    Logger.error('清除存储失败', error)
    throw error
  }
}

export default {
  getStorage,
  setStorage,
  batchSetStorage,
  removeStorage,
  clearStorage,
}
