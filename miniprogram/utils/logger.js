const fs = wx.getFileSystemManager()
const LOG_DIR = `${wx.env.USER_DATA_PATH}/logs`
const LOG_FILE = `${LOG_DIR}/app.log`
const MAX_LOG_SIZE = 1024 * 1024 // 1MB

// 确保日志目录存在
function ensureLogDir() {
  try {
    try {
      fs.accessSync(LOG_DIR)
    } catch (e) {
      fs.mkdirSync(LOG_DIR, true)
    }
  } catch (error) {
    console.error('创建日志目录失败', error)
  }
}

// 初始化日志文件
function initLogFile() {
  ensureLogDir()
  try {
    try {
      fs.accessSync(LOG_FILE)
    } catch (e) {
      fs.writeFileSync(LOG_FILE, '', 'utf8')
    }
  } catch (error) {
    console.error('初始化日志文件失败', error)
  }
}

// 检查日志文件大小，如果超过限制则备份并创建新文件
function checkLogFileSize() {
  try {
    const stats = fs.statSync(LOG_FILE)
    if (stats.size > MAX_LOG_SIZE) {
      const timestamp = new Date().toISOString().replace(/:/g, '-')
      const backupFile = `${LOG_DIR}/app_${timestamp}.log`
      fs.renameSync(LOG_FILE, backupFile)
      fs.writeFileSync(LOG_FILE, '', 'utf8')
      return true
    }
  } catch (error) {
    console.error('检查日志文件大小失败', error)
  }
  return false
}

// 日志工具
const Logger = {
  // 日志级别
  levels: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },

  // 当前日志级别
  currentLevel: 0, // DEBUG

  // 日志存储
  logs: [],

  // 最大内存日志条数
  maxLogs: 100,

  // 初始化
  init() {
    initLogFile()
    this.info('日志系统初始化完成')
  },

  // 记录日志
  log(level, message, data = null) {
    if (level < this.currentLevel) return

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: Object.keys(this.levels).find(key => this.levels[key] === level),
      message,
      data: data ? JSON.stringify(data) : null,
    }

    // 添加到内存中
    this.logs.push(logEntry)

    // 如果超过最大条数，删除最早的日志
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // 写入文件
    this.writeToFile(logEntry)

    // 控制台输出
    console.log(`[${logEntry.level}] ${logEntry.message}`, data || '')
  },

  // 写入文件
  writeToFile(logEntry) {
    try {
      // 检查文件大小
      checkLogFileSize()

      // 格式化日志条目
      const logLine = `[${logEntry.timestamp}] [${logEntry.level}] ${logEntry.message}${
        logEntry.data ? ' - ' + logEntry.data : ''
      }\n`

      // 追加到文件
      fs.appendFileSync(LOG_FILE, logLine, 'utf8')
    } catch (error) {
      console.error('写入日志文件失败', error)
    }
  },

  // 调试日志
  debug(message, data) {
    this.log(this.levels.DEBUG, message, data)
  },

  // 信息日志
  info(message, data) {
    this.log(this.levels.INFO, message, data)
  },

  // 警告日志
  warn(message, data) {
    this.log(this.levels.WARN, message, data)
  },

  // 错误日志
  error(message, data) {
    this.log(this.levels.ERROR, message, data)
  },

  // 获取所有日志
  getAllLogs() {
    return this.logs
  },

  // 获取特定级别的日志
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level)
  },

  // 读取日志文件内容
  readLogFile(callback) {
    try {
      fs.readFile({
        filePath: LOG_FILE,
        encoding: 'utf8',
        success: res => {
          if (callback) callback(null, res.data)
        },
        fail: err => {
          console.error('读取日志文件失败', err)
          if (callback) callback(err)
        },
      })
    } catch (error) {
      console.error('读取日志文件异常', error)
      if (callback) callback(error)
    }
  },

  // 获取所有日志文件
  getLogFiles(callback) {
    try {
      fs.readdir({
        dirPath: LOG_DIR,
        success: res => {
          if (callback) callback(null, res.files)
        },
        fail: err => {
          console.error('读取日志目录失败', err)
          if (callback) callback(err)
        },
      })
    } catch (error) {
      console.error('获取日志文件异常', error)
      if (callback) callback(error)
    }
  },

  // 清空日志
  clearLogs() {
    this.logs = []
    try {
      fs.writeFileSync(LOG_FILE, '', 'utf8')
      this.info('日志已清空')
    } catch (error) {
      console.error('清空日志文件失败', error)
    }
  },

  // 导出日志文件
  exportLogFile(callback) {
    this.readLogFile((err, content) => {
      if (err) {
        if (callback) callback(err)
        return
      }

      if (callback) callback(null, content)
    })
  },
}

// 初始化日志系统
Logger.init()

export default Logger
