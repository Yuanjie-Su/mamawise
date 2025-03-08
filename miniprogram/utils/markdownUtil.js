/**
 * Markdown 工具函数
 * 提供 Markdown 文本格式化功能
 */

import Logger from './logger';

/**
 * 格式化 Markdown 文本为 HTML
 * @param {String} text - 原始 Markdown 文本
 * @returns {String} 格式化后的 HTML 文本
 */
function formatMarkdown(text) {
  if (!text) return '';
  
  try {
    // 创建一个格式化规则数组，一次性应用所有规则
    const formatRules = [
      // 处理标题 (h1-h6)
      {
        regex: /^(#{1,6})\s+(.*)$/gm,
        replacement: (match, hashes, content) => {
          const hLevel = hashes.length;
          const fontSize = 28 - (hLevel - 1) * 2;
          return `<div style="font-size:${fontSize}px;font-weight:bold;margin:8px 0;">${content}</div>`;
        }
      },
      // 处理加粗
      {
        regex: /\*\*(.*?)\*\*/g,
        replacement: '<b>$1</b>'
      },
      // 处理斜体
      {
        regex: /\*(.*?)\*/g,
        replacement: '<i>$1</i>'
      },
      // 处理无序列表
      {
        regex: /^\s*-\s+(.*)$/gm,
        replacement: '<div style="margin-left:16px;">• $1</div>'
      },
      // 处理有序列表
      {
        regex: /^\s*(\d+)\.\s+(.*)$/gm,
        replacement: '<div style="margin-left:16px;">$1. $2</div>'
      },
      // 处理代码块
      {
        regex: /```([\s\S]*?)```/g,
        replacement: '<div style="background-color:#f5f5f5;padding:8px;border-radius:4px;font-family:monospace;white-space:pre-wrap;margin:8px 0;font-size:12px;">$1</div>'
      },
      // 处理行内代码
      {
        regex: /`([^`]+)`/g,
        replacement: '<span style="background-color:#f5f5f5;padding:2px 4px;border-radius:3px;font-family:monospace;font-size:12px;">$1</span>'
      },
      // 处理水平线
      {
        regex: /^---+$/gm,
        replacement: '<div style="border-top:1px solid #eee;margin:8px 0;"></div>'
      },
      // 处理链接
      {
        regex: /\[([^\]]+)\]\(([^)]+)\)/g,
        replacement: '<a style="color:#0366d6;" href="$2">$1</a>'
      },
      // 处理段落
      {
        regex: /\n\n/g,
        replacement: '<div style="margin:8px 0;"></div>'
      },
      // 处理换行
      {
        regex: /\n/g,
        replacement: '<br>'
      }
    ];
    
    // 一次性应用所有规则
    return formatRules.reduce((formattedText, rule) => {
      return formattedText.replace(rule.regex, rule.replacement);
    }, text);
    
  } catch (error) {
    Logger.error('Markdown格式化错误:', error);
    // 如果格式化失败，返回纯文本
    return text.replace(/\n/g, '<br>');
  }
}

/**
 * 检查文本是否包含 Markdown 语法
 * @param {String} text - 要检查的文本
 * @returns {Boolean} 是否包含 Markdown 语法
 */
function containsMarkdown(text) {
  if (!text) return false;
  
  // 检查常见的 Markdown 语法
  const markdownPatterns = [
    /^#{1,6}\s+/m,      // 标题
    /\*\*(.*?)\*\*/,    // 加粗
    /\*(.*?)\*/,        // 斜体
    /^\s*-\s+/m,        // 无序列表
    /^\s*\d+\.\s+/m,    // 有序列表
    /```[\s\S]*?```/,   // 代码块
    /`[^`]+`/,          // 行内代码
    /^---+$/m,          // 水平线
    /\[([^\]]+)\]\(([^)]+)\)/ // 链接
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
}

export default {
  formatMarkdown,
  containsMarkdown
}; 