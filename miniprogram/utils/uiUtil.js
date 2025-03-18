/**
 * UI工具模块
 * 对常用UI操作进行封装
 */

import Logger from './logger'

/**
 * 显示加载提示
 * @param {string} title - 提示文本
 * @param {boolean} mask - 是否显示遮罩
 * @returns {void}
 */
function showLoading(title = '加载中...', mask = true) {
  wx.showLoading({ title, mask })
}

/**
 * 隐藏加载提示
 * @returns {void}
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示消息提示
 * @param {string} title - 提示文本
 * @param {string} icon - 图标类型，可选值：'success', 'error', 'loading', 'none'
 * @param {number} duration - 提示显示时间，单位ms
 * @returns {Promise<void>}
 */
async function showToast(title, icon = 'none', duration = 1500) {
  try {
    await wx.showToast({ title, icon, duration })
  } catch (error) {
    Logger.error('显示消息提示失败', error)
  }
}

/**
 * 显示模态对话框
 * @param {string} title - 标题
 * @param {string} content - 内容
 * @param {boolean} showCancel - 是否显示取消按钮
 * @param {string} confirmText - 确认按钮文本
 * @param {string} cancelText - 取消按钮文本
 * @param {boolean} editable - 是否可编辑内容
 * @param {string} placeholderText - 编辑框占位文本
 * @returns {Promise<{confirm: boolean, cancel: boolean, content?: string}>}
 */
async function showModal(options) {
  const {
    title,
    content = '',
    showCancel = true,
    confirmText = '确定',
    cancelText = '取消',
    editable = false,
    placeholderText = '',
  } = options

  try {
    return await wx.showModal({
      title,
      content,
      showCancel,
      confirmText,
      cancelText,
      editable,
      placeholderText,
    })
  } catch (error) {
    Logger.error('显示模态对话框失败', error)
    throw error
  }
}

/**
 * 显示操作菜单
 * @param {Array<string>} itemList - 菜单项列表
 * @returns {Promise<{tapIndex: number}>}
 */
async function showActionSheet(itemList) {
  try {
    return await wx.showActionSheet({ itemList })
  } catch (error) {
    // 用户取消操作不算错误，返回特殊值表示用户取消
    if (error && error.errMsg && error.errMsg.indexOf('cancel') !== -1) {
      Logger.info('用户取消操作菜单')
      return { tapIndex: -1, canceled: true }
    }

    Logger.error('显示操作菜单失败', error)
    throw error
  }
}

export default {
  showLoading,
  hideLoading,
  showToast,
  showModal,
  showActionSheet,
}
