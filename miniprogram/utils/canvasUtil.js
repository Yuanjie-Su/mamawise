/**
 * Canvas工具模块
 * 提供画布相关操作的工具函数
 */

import Logger from './logger'

/**
 * 计算文本高度 (Canvas 2D版本)
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {string} text - 要绘制的文本
 * @param {number} maxWidth - 最大宽度
 * @param {number} lineHeight - 行高
 * @returns {number} 文本总高度
 */
function calculateTextHeight2d(ctx, text, maxWidth, lineHeight) {
  // 如果文本为空，返回一行的高度
  if (!text || text.trim() === '') {
    return lineHeight
  }

  // 先按换行符分割文本
  const paragraphs = text.split('\n')
  let totalHeight = 0

  // 处理每个段落
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim()
    if (paragraph.length === 0) {
      // 空行高度减小
      totalHeight += lineHeight * 0.1
      continue
    }

    let line = ''
    let lineCount = 1 // 每个段落至少有一行

    // 按单个字符分割，确保中文字符也能正确处理
    for (let j = 0; j < paragraph.length; j++) {
      const char = paragraph.charAt(j)
      const testLine = line + char
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > maxWidth && j > 0) {
        line = char
        lineCount++
      } else {
        line = testLine
      }
    }

    totalHeight += lineCount * lineHeight

    // 段落之间的间距
    if (i < paragraphs.length - 1) {
      totalHeight += lineHeight * 0.1
    }
  }

  // 确保文本有足够的底部间距
  return totalHeight + lineHeight * 0.3
}

/**
 * 处理文本换行和居左显示 (Canvas 2D版本)
 * @param {CanvasRenderingContext2D} ctx - Canvas上下文
 * @param {string} text - 要绘制的文本
 * @param {number} x - 起始x坐标
 * @param {number} y - 起始y坐标
 * @param {number} maxWidth - 最大宽度
 * @param {number} lineHeight - 行高
 */
function wrapText2d(ctx, text, x, y, maxWidth, lineHeight) {
  // 如果文本为空，不做任何处理
  if (!text || text.trim() === '') {
    return
  }

  // 先按换行符分割文本
  const paragraphs = text.split('\n')
  let currentY = y

  // 处理每个段落
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim()
    if (paragraph.length === 0) {
      // 空行高度减小
      currentY += lineHeight * 0.1
      continue
    }

    let line = ''
    let lineStartX = x
    let lines = []

    // 收集所有的行
    for (let j = 0; j < paragraph.length; j++) {
      const char = paragraph.charAt(j)
      const testLine = line + char
      const metrics = ctx.measureText(testLine)
      const testWidth = metrics.width

      if (testWidth > maxWidth && j > 0) {
        // 收集这一行
        lines.push(line)
        line = char
      } else {
        line = testLine
      }
    }

    // 添加最后一行
    if (line.length > 0) {
      lines.push(line)
    }

    // 绘制段落的所有行，不再居中显示
    for (let j = 0; j < lines.length; j++) {
      const lineText = lines[j]

      // 所有行都从x开始（左对齐）
      ctx.fillText(lineText, x, currentY)
      currentY += lineHeight
    }

    // 段落之间增加一行间距
    if (i < paragraphs.length - 1) {
      currentY += lineHeight * 0.1 // 减小段落间间距，避免过大
    }
  }
}

/**
 * 生成分享图片
 * @param {Object} message - 消息对象
 * @param {Object} options - 配置选项
 * @param {Component} component - 组件实例
 * @returns {Promise<string>} 图片临时路径
 */
async function generateShareImage(message, options, component) {
  // options参数解构
  const {
    titleExtractor = content => ({ title: '笔记内容', content }),
    canvasId = '#shareCanvas',
  } = options || {}

  return new Promise((resolve, reject) => {
    if (!message || !message.content) {
      wx.showToast({
        title: '消息内容为空',
        icon: 'none',
      })
      reject(new Error('消息内容为空'))
      return
    }

    // 显示加载提示
    wx.showLoading({
      title: '生成图片中...',
      mask: true,
    })

    try {
      // 使用新API获取窗口信息
      const windowInfo = wx.getWindowInfo()

      // 提取标题和内容
      const { title, content: contentProcessed } =
        typeof titleExtractor === 'function'
          ? titleExtractor(message.content)
          : { title: '内容', content: message.content }

      // 获取Canvas 2D上下文
      const query = wx.createSelectorQuery()
      if (component) {
        query.in(component)
      }

      query
        .select(canvasId)
        .fields({ node: true, size: true })
        .exec(res => {
          if (!res || !res[0] || !res[0].node) {
            wx.hideLoading()
            reject(new Error('无法获取Canvas节点'))
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')

          // 设置画布大小
          const screenWidth = windowInfo.windowWidth
          const canvasWidth = screenWidth * 0.9 // 画布宽度为屏幕宽度的90%
          const padding = 30 // 内边距
          const lineHeight = 40 // 行高
          const maxTextWidth = canvasWidth - padding * 2 // 文本最大宽度
          const titleHeight = 60 // 标题区域高度

          // 计算文本高度
          const textHeight = calculateTextHeight2d(ctx, contentProcessed, maxTextWidth, lineHeight)

          // 计算总画布高度 - 只有标题和正文
          const canvasHeight = textHeight + padding * 3 + titleHeight

          // 设置画布尺寸（物理像素）
          const dpr = wx.getSystemInfoSync().pixelRatio
          canvas.width = canvasWidth * dpr
          canvas.height = canvasHeight * dpr

          // 缩放所有绘制操作，以适应高DPI屏幕
          ctx.scale(dpr, dpr)

          // 更新组件内的画布高度变量
          if (component && component.setData) {
            component.setData({
              canvasHeight: canvasHeight,
            })
          }

          // 绘制背景
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, canvasWidth, canvasHeight)

          // 计算居中X坐标
          const centerX = canvasWidth / 2

          // 绘制标题
          ctx.fillStyle = '#333333'
          ctx.font = 'bold 20px sans-serif'
          ctx.textAlign = 'center' // 标题居中显示

          // 居中绘制标题
          ctx.fillText(title, centerX, padding + 30)

          // 绘制内容 - 使用处理后的内容，左对齐显示
          ctx.fillStyle = '#333333'
          ctx.font = '16px sans-serif'
          ctx.textAlign = 'left' // 确保文本左对齐
          wrapText2d(
            ctx,
            contentProcessed,
            padding,
            padding + titleHeight,
            maxTextWidth,
            lineHeight
          )

          // 将画布内容转为图片
          wx.canvasToTempFilePath(
            {
              canvas: canvas,
              success: res => {
                wx.hideLoading()
                resolve(res.tempFilePath)
              },
              fail: err => {
                wx.hideLoading()
                Logger.error('生成图片失败', err)
                wx.showToast({
                  title: '生成图片失败',
                  icon: 'none',
                })
                reject(err)
              },
            },
            component
          )
        })
    } catch (err) {
      wx.hideLoading()
      Logger.error('获取窗口信息失败', err)
      reject(err)
    }
  })
}

/**
 * 保存图片到相册
 * @param {string} filePath - 图片临时路径
 * @returns {Promise<void>}
 */
function saveImageToAlbum(filePath) {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath: filePath,
      success: () => {
        wx.showToast({
          title: '已保存到相册',
          icon: 'success',
        })
        resolve()
      },
      fail: err => {
        Logger.error('保存图片失败', err)

        if (err.errMsg.indexOf('auth deny') >= 0) {
          wx.showModal({
            title: '提示',
            content: '需要您授权保存图片到相册',
            confirmText: '去授权',
            success: res => {
              if (res.confirm) {
                wx.openSetting()
              }
            },
          })
        } else {
          wx.showToast({
            title: '保存图片失败',
            icon: 'none',
          })
        }
        reject(err)
      },
    })
  })
}

export default {
  calculateTextHeight2d,
  wrapText2d,
  generateShareImage,
  saveImageToAlbum,
}
