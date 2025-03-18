const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const notesCollection = db.collection('notes')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const {
    unsavedNotes
  } = event
  try {
    // 获取现有的笔记列表
    const existingDoc = await notesCollection
      .where({
        _openid: openid,
      })
      .get()

    if (existingDoc.data.length === 0) {
      // 插入新的笔记列表
      await notesCollection.add({
        data: {
          _openid: openid,
          lists: unsavedNotes,
        },
      })
      return {
        success: true,
      }
    }

    const existingNotes = existingDoc.data[0].lists

    // 合并笔记,相同id的覆盖
    const mergedNotes = [...existingNotes]
    unsavedNotes.forEach(newNote => {
      const index = mergedNotes.findIndex(f => f.id === newNote.id)
      if (index >= 0) {
        mergedNotes[index] = newNote
      } else {
        mergedNotes.push(newNote)
      }
    })

    await notesCollection
      .where({
        _openid: openid,
      })
      .update({
        data: {
          lists: mergedNotes,
        },
      })
    return {
      success: true,
    }
  } catch (e) {
    return {
      success: false,
      error: e,
    }
  }
}