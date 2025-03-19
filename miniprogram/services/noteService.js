/**
 * 笔记服务
 * 负责处理笔记的保存、获取、删除等操作
 */

import Logger from '../utils/logger'
import appConfig from '../config/appConfig'
import storageUtil from '../utils/storageUtil'
import textUtil from '../utils/textUtil'

const { STORAGE_KEYS, CLOUD_FUNCTIONS } = appConfig

/**
 * 获取所有笔记
 * @returns {Promise<Array>} 笔记列表
 */
async function getNotes() {
  try {
    const notes = await storageUtil.getStorage(STORAGE_KEYS.NOTES, [])
    return notes
  } catch (error) {
    Logger.error('获取笔记失败', error)
    return []
  }
}

/**
 * 保存笔记
 * @param {Object} note - 笔记对象
 * @returns {Promise<boolean>} 是否保存成功
 */
async function saveNote(note) {
  try {
    if (!note) {
      throw new Error('笔记内容为空')
    }

    // 确保笔记有ID和时间戳
    if (!note.id) {
      note.id = Date.now().toString()
    }

    if (!note.timestamp) {
      note.timestamp = Date.now()
    }

    if (!note.date) {
      note.date = textUtil.formatDate(new Date(note.timestamp))
    }

    // 获取现有笔记
    const notes = await getNotes()

    // 检查笔记是否已存在
    const existingNoteIndex = notes.findIndex(n => n.id === note.id)

    if (existingNoteIndex >= 0) {
      // 更新已有笔记
      notes[existingNoteIndex] = note
    } else {
      // 添加新笔记
      notes.push(note)
    }

    // 保存到本地
    await storageUtil.setStorage(STORAGE_KEYS.NOTES, notes)

    // 标记笔记已更改
    wx.setStorageSync(STORAGE_KEYS.NOTES_CHANGED, true)

    // 如果用户已登录，保存到云端
    try {
      const isLoggedIn = wx.getStorageSync(STORAGE_KEYS.IS_LOGGED_IN)
      if (isLoggedIn) {
        await syncNotesToCloud(notes)
      }
    } catch (cloudError) {
      Logger.error('同步笔记到云端失败', cloudError)
      // 即使云端保存失败，也认为操作成功，因为本地已保存
    }

    return true
  } catch (error) {
    Logger.error('保存笔记失败', error)
    return false
  }
}

/**
 * 删除笔记
 * @param {string} noteId - 笔记ID
 * @returns {Promise<boolean>} 是否删除成功
 */
async function deleteNote(noteId) {
  try {
    if (!noteId) {
      throw new Error('笔记ID为空')
    }

    // 获取现有笔记
    const notes = await getNotes()

    // 过滤掉要删除的笔记
    const updatedNotes = notes.filter(note => note.id !== noteId)

    // 检查是否存在该笔记
    if (notes.length === updatedNotes.length) {
      Logger.warn('要删除的笔记不存在', noteId)
      return false
    }

    // 保存更新后的笔记列表
    await storageUtil.setStorage(STORAGE_KEYS.NOTES, updatedNotes)

    // 标记笔记已更改
    wx.setStorageSync(STORAGE_KEYS.NOTES_CHANGED, true)

    // 如果用户已登录，同步到云端
    try {
      const isLoggedIn = wx.getStorageSync(STORAGE_KEYS.IS_LOGGED_IN)
      if (isLoggedIn) {
        // 调用云函数删除笔记
        await wx.cloud.callFunction({
          name: CLOUD_FUNCTIONS.DELETE_NOTE,
          data: { noteId },
        })
      }
    } catch (cloudError) {
      Logger.error('从云端删除笔记失败', cloudError)
      // 即使云端删除失败，也认为操作成功，因为本地已删除
    }

    return true
  } catch (error) {
    Logger.error('删除笔记失败', error)
    return false
  }
}

/**
 * 获取笔记详情
 * @param {string} noteId - 笔记ID
 * @returns {Promise<Object|null>} 笔记详情或null
 */
async function getNoteDetail(noteId) {
  try {
    if (!noteId) {
      throw new Error('笔记ID为空')
    }

    // 获取所有笔记
    const notes = await getNotes()

    // 查找指定ID的笔记
    const note = notes.find(note => note.id === noteId)

    if (!note) {
      Logger.warn('未找到指定ID的笔记', noteId)
      return null
    }

    return note
  } catch (error) {
    Logger.error('获取笔记详情失败', error)
    return null
  }
}

/**
 * 将笔记同步到云端
 * @param {Array} notes - 笔记列表
 * @returns {Promise<boolean>} 是否同步成功
 */
async function syncNotesToCloud(notes) {
  try {
    // 如果参数为空，获取本地笔记
    if (!notes) {
      notes = await getNotes()
    }

    // 调用云函数更新笔记
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.UPDATE_NOTES,
      data: { notes },
    })

    if (!res || !res.result || !res.result.success) {
      throw new Error(res?.result?.error || '同步笔记到云端失败')
    }

    return true
  } catch (error) {
    Logger.error('同步笔记到云端失败', error)
    return false
  }
}

/**
 * 从云端获取笔记
 * @returns {Promise<boolean>} 是否获取成功
 */
async function syncNotesFromCloud() {
  try {
    // 调用云函数获取笔记
    const res = await wx.cloud.callFunction({
      name: CLOUD_FUNCTIONS.GET_NOTES,
    })

    if (!res || !res.result || !res.result.success) {
      throw new Error(res?.result?.error || '从云端获取笔记失败')
    }

    const cloudNotes = res.result.notes || []

    // 保存到本地
    await storageUtil.setStorage(STORAGE_KEYS.NOTES, cloudNotes)

    // 重置笔记更改标记
    wx.setStorageSync(STORAGE_KEYS.NOTES_CHANGED, false)

    return true
  } catch (error) {
    Logger.error('从云端获取笔记失败', error)
    return false
  }
}

/**
 * 添加内容为笔记
 * @param {string} content - 笔记内容
 * @returns {Promise<boolean>} 是否添加成功
 */
async function addContentAsNote(content) {
  try {
    if (!content) {
      throw new Error('笔记内容为空')
    }

    // 提取标题和内容
    const { title, content: processedContent } = textUtil.extractTitleAndContent(content)

    // 创建笔记对象
    const now = new Date()
    const note = {
      id: Date.now().toString(),
      title,
      content: processedContent,
      date: textUtil.formatDate(now),
      timestamp: now.getTime(),
    }

    // 保存笔记
    const success = await saveNote(note)

    if (success) {
      wx.showToast({
        title: '添加笔记成功',
        icon: 'success',
      })
    }

    return success
  } catch (error) {
    Logger.error('添加内容为笔记失败', error)
    wx.showToast({
      title: '添加笔记失败',
      icon: 'none',
    })
    return false
  }
}

export default {
  getNotes,
  saveNote,
  deleteNote,
  getNoteDetail,
  syncNotesToCloud,
  syncNotesFromCloud,
  addContentAsNote,
}
