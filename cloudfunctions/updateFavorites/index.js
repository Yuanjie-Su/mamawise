const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const db = cloud.database()

const favoritesCollection = db.collection('favorites')

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const { unsavedFavorites } = event
  try {
    // 获取现有的收藏列表
    const existingDoc = await favoritesCollection
      .where({
        _openid: openid,
      })
      .get()

    if (existingDoc.data.length === 0) {
      // 插入新的收藏列表
      await favoritesCollection.add({
        data: {
          _openid: openid,
          lists: unsavedFavorites,
        },
      })
      console.log('插入新的收藏列表', unsavedFavorites)
      return {
        success: true,
      }
    }

    const existingFavorites = existingDoc.data[0].lists

    // 合并收藏,相同id的覆盖
    const mergedFavorites = [...existingFavorites]
    unsavedFavorites.forEach(newFav => {
      const index = mergedFavorites.findIndex(f => f.id === newFav.id)
      if (index >= 0) {
        mergedFavorites[index] = newFav
      } else {
        mergedFavorites.push(newFav)
      }
    })
    console.log('mergedFavorites', mergedFavorites)
    // 使用set方法直接覆盖整个文档（更安全）
    await favoritesCollection
      .where({
        _openid: openid,
      })
      .update({
        data: {
          lists: mergedFavorites,
        },
      })
    console.log('更新收藏列表mergedFavorites', mergedFavorites)
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
