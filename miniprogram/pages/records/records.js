// pages/records/records.js
const app = getApp()
import Logger from '../../utils/logger'
import healthRecordService from '../../services/healthRecordService'
import appConfig from '../../config/appConfig'

const { DEFAULT_HEALTH_RECORDS } = appConfig

// 定义需要提取的属性列表
const FIELDS = [
  'pregnancyInfo',
  'allergyInfo',
  'dietPreference',
  'otherInfo',
  'bloodPressureRecords',
  'weightRecords',
  'bloodSugarRecords',
  'temperatureRecords',
  'heartRateRecords',
  'fetalMovementRecords',
  'medications',
  'checkupRecords',
  'checkupAnalysis',
]

Page({
  data: {
    isLoggedIn: false,
    activeTab: 0,
    tabs: ['基本信息', '体征记录', '用药记录', '产检记录'],

    // 扁平化的数据结构
    // 孕期信息
    pregnancyInfo: {
      week: '',
      dueDate: '',
      daysRemaining: '', // 添加剩余天数字段
    },
    // 过敏信息
    allergyInfo: [],
    // 饮食偏好
    dietPreference: [],
    // 其他信息
    otherInfo: '',

    // 体征记录
    bloodPressureRecords: [],
    weightRecords: [],
    bloodSugarRecords: [],
    temperatureRecords: [],
    heartRateRecords: [],
    fetalMovementRecords: [],

    // 药物记录
    medications: [],

    // 产检记录
    checkupRecords: [],
    checkupAnalysis: '', // 添加产检分析结果

    // 其他信息表单相关
    showOtherInfoForm: false,
    otherInfoForm: {
      age: '',
      height: '',
      weight: '',
    },

    // 年龄选项 (14-50岁)
    ageOptions: Array.from(
      {
        length: 36,
      },
      (_, i) => (14 + i).toString()
    ),
    ageIndex: -1,

    // 身高选项 (130cm-200cm)
    heightOptions: Array.from(
      {
        length: 71,
      },
      (_, i) => (130 + i).toString()
    ),
    heightIndex: -1,

    // 体重选项 (35kg-120kg，步长0.5kg)
    weightOptions: Array.from(
      {
        length: 171,
      },
      (_, i) => (35 + i * 0.5).toFixed(1)
    ),
    weightIndex: -1,

    // 孕期信息表单相关
    showPregnancyInfoForm: false,
    pregnancyInfoForm: {
      week: '',
      dueDate: '',
    },
    // 孕周选项
    pregnancyWeekOptions: Array.from(
      {
        length: 42,
      },
      (_, i) => (i + 1).toString()
    ),
    pregnancyWeekIndex: 0,

    // 用药表单相关
    showMedicationForm: false,
    editingMedication: false,
    editingMedicationIndex: -1,
    medicationForm: {
      name: '',
      typeIndex: -1,
      dosage: '',
      frequency: '',
      timeIndex: -1,
      startDate: '',
      endDate: '',
      notes: '',
    },
    medicationTypes: ['处方药', '非处方药', '保健品', '中药', '其他'],
    medicationTimes: ['饭前', '饭后', '睡前', '早晨', '中午', '晚上', '需要时'],

    // 体征记录表单
    showVitalsForm: false,
    editingVitals: false,
    editingVitalsIndex: -1,
    editingVitalsType: '',
    currentVitalsTypeName: '',
    vitalsForm: {
      type: '',
      value: '',
      date: '',
      time: '',
      notes: '',
    },
    vitalsTypes: [
      {
        name: '血压',
        unit: 'mmHg',
        placeholder: '如：120/80',
        valueOptions: [
          '90/60',
          '95/65',
          '100/70',
          '105/75',
          '110/70',
          '110/75',
          '115/75',
          '120/80',
          '125/80',
          '125/85',
          '130/80',
          '130/85',
          '130/90',
          '135/85',
          '135/90',
          '140/90',
          '145/90',
          '145/95',
          '150/95',
        ],
      },
      {
        name: '体重',
        unit: 'kg',
        placeholder: '如：65.5',
        valueOptions: Array.from(
          {
            length: 81,
          },
          (_, i) => (40 + i * 0.5).toFixed(1)
        ), // 40kg - 80kg，步长0.5kg
      },
      {
        name: '血糖',
        unit: 'mmol/L',
        placeholder: '如：5.6',
        valueOptions: Array.from(
          {
            length: 61,
          },
          (_, i) => (3.0 + i * 0.1).toFixed(1)
        ), // 3.0 - 9.0，步长0.1
      },
      {
        name: '体温',
        unit: '°C',
        placeholder: '如：36.5',
        valueOptions: Array.from(
          {
            length: 21,
          },
          (_, i) => (35.5 + i * 0.1).toFixed(1)
        ), // 35.5 - 37.5，步长0.1
      },
      {
        name: '心率',
        unit: '次/分',
        placeholder: '如：75',
        valueOptions: Array.from(
          {
            length: 81,
          },
          (_, i) => (40 + i).toString()
        ), // 40 - 120，步长1
      },
      {
        name: '胎动',
        unit: '次/小时',
        placeholder: '如：10',
        valueOptions: Array.from(
          {
            length: 31,
          },
          (_, i) => i.toString()
        ), // 0 - 30，步长1
      },
    ],
    vitalsTypeIndex: 0,
    vitalsValueIndex: 0,

    // 过敏信息表单相关
    showAllergyForm: false,
    allergyForm: {
      allergy: '',
    },
    // 过敏信息示例
    allergyExamples: [
      '海鲜',
      '花粉',
      '牛奶',
      '鸡蛋',
      '小麦',
      '花生',
      '大豆',
      '坚果',
      '贝类',
      '鱼类',
      '药物',
      '螨虫',
    ],

    // 饮食偏好表单相关
    showDietPreferenceForm: false,
    dietPreferenceForm: {
      preference: '',
    },
    // 饮食偏好示例
    dietExamples: [
      '素食',
      '低糖',
      '低盐',
      '低脂',
      '高蛋白',
      '无麸质',
      '无乳糖',
      '辣食',
      '清淡',
      '酸性食物',
      '碱性食物',
      '有机食品',
    ],
  },

  // =============================================
  // 页面生命周期函数
  // =============================================

  onShow() {
    // 检查登录状态
    this.checkLoginStatus()
  },

  // =============================================
  // 通用功能函数
  // =============================================

  // 检查登录状态
  checkLoginStatus() {
    // 检查用户登录状态是否改变
    const isLoggedIn = app.globalData.isLoggedIn
    if (isLoggedIn === this.data.isLoggedIn) {
      return
    }

    this.setData({
      isLoggedIn,
    })

    if (isLoggedIn) {
      this.loadHealthRecords()
    } else {
      this.setData({
        isLoggedIn: false,
        ...DEFAULT_HEALTH_RECORDS,
      })
    }
  },

  // 从本地加载'基本信息', '体征记录', '用药记录', '产检记录'
  async loadHealthRecords() {
    try {
      let healthRecords = wx.getStorageSync('healthRecords')
      if (!healthRecords) {
        // 使用healthRecordService获取健康记录
        healthRecords = await healthRecordService.getHealthRecords(DEFAULT_HEALTH_RECORDS)

        // 将健康记录存储到本地
        wx.setStorage({
          key: 'healthRecords',
          data: healthRecords,
        })
      }

      Logger.debug('健康记录加载成功', healthRecords)

      // 设置页面数据，使用扁平化的数据结构
      this.setData({
        // 孕期信息
        pregnancyInfo: healthRecords.pregnancyInfo || {},
        // 过敏信息
        allergyInfo: healthRecords.allergyInfo || [],
        // 饮食偏好
        dietPreference: healthRecords.dietPreference || [],
        // 其他信息
        otherInfo: healthRecords.otherInfo || '',
        // 体征记录
        // 血压记录
        bloodPressureRecords: healthRecords.bloodPressureRecords || [],
        // 体重记录
        weightRecords: healthRecords.weightRecords || [],
        // 血糖记录
        bloodSugarRecords: healthRecords.bloodSugarRecords || [],
        // 体温记录
        temperatureRecords: healthRecords.temperatureRecords || [],
        // 心率记录
        heartRateRecords: healthRecords.heartRateRecords || [],
        // 胎动记录
        fetalMovementRecords: healthRecords.fetalMovementRecords || [],
        // 药物记录
        medications: healthRecords.medications || [],
        // 检查记录
        checkupRecords: healthRecords.checkupRecords || [],
        // 检查分析
        checkupAnalysis: healthRecords.checkupAnalysis || '',
      })

      console.log('健康记录加载成功')
    } catch (e) {
      this.setData({
        ...DEFAULT_HEALTH_RECORDS,
      })
      console.error('加载健康记录失败:', e)
    }
  },

  // 切换标签页
  switchTab(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index,
    })
  },

  // 导航到个人中心页面
  navigateToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile',
    })
  },

  // =============================================
  // 基本信息相关函数
  // =============================================

  // ----- 孕期信息 -----

  // 显示编辑孕期信息表单
  showEditPregnancyInfoForm() {
    // 查找当前孕周在选项中的索引
    let weekIndex = this.data.pregnancyWeekOptions.findIndex(
      w => w === this.data.pregnancyInfo.week
    )
    if (weekIndex === -1) weekIndex = 0 // 默认第1周

    this.setData({
      showPregnancyInfoForm: true,
      pregnancyWeekIndex: weekIndex,
      pregnancyInfoForm: {
        week: this.data.pregnancyInfo.week || '',
        dueDate: this.data.pregnancyInfo.dueDate || '',
      },
    })
  },

  // 隐藏孕期信息表单
  hidePregnancyInfoForm() {
    this.setData({
      showPregnancyInfoForm: false,
    })
  },

  // 处理孕周选择变化
  onPregnancyWeekChange(e) {
    const weekIndex = parseInt(e.detail.value)
    const week = this.data.pregnancyWeekOptions[weekIndex]

    this.setData({
      pregnancyWeekIndex: weekIndex,
      'pregnancyInfoForm.week': week,
    })

    // 根据孕周自动计算预产期
    this.calculateDueDate(week)
  },

  // 处理预产期选择变化
  onDueDateChange(e) {
    this.setData({
      'pregnancyInfoForm.dueDate': e.detail.value,
    })
  },

  // 根据孕周计算预产期
  calculateDueDate(week) {
    const today = new Date()
    const weekNum = parseInt(week)

    // 计算距离预产期还有多少天
    // 孕期总共40周，所以剩余天数 = (40 - 当前孕周) * 7
    const daysRemaining = (40 - weekNum) * 7

    // 计算预产期
    const dueDate = new Date(today.getTime() + daysRemaining * 24 * 60 * 60 * 1000)

    // 格式化日期为 YYYY-MM-DD
    const year = dueDate.getFullYear()
    const month = String(dueDate.getMonth() + 1).padStart(2, '0')
    const day = String(dueDate.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}`

    this.setData({
      'pregnancyInfoForm.dueDate': formattedDate,
    })
  },

  // 保存孕期信息
  savePregnancyInfo() {
    const { week, dueDate } = this.data.pregnancyInfoForm

    // 验证输入
    if (!week || !dueDate) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none',
      })
      return
    }

    // 计算距离预产期的剩余天数
    const today = new Date()
    const dueDateTime = new Date(dueDate)
    const timeDiff = dueDateTime - today
    const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24))

    // 更新页面数据
    this.setData({
      pregnancyInfo: {
        week,
        dueDate,
        daysRemaining: daysRemaining.toString(),
      },
      showPregnancyInfoForm: false,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt('pregnancyInfo', this.data.pregnancyInfo)
  },

  // 计算距离宝宝出生还剩多少天
  calculateDaysRemaining(pregnancyDueDate) {
    if (pregnancyDueDate) {
      const today = new Date()
      const dueDate = new Date(pregnancyDueDate)

      // 计算相差的毫秒数
      const diffTime = dueDate.getTime() - today.getTime()

      // 转换为天数
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      // 更新数据
      if (diffDays >= 0) {
        this.setData({
          'pregnancyInfo.daysRemaining': diffDays,
        })
      } else {
        // 如果已经过了预产期
        this.setData({
          'pregnancyInfo.daysRemaining': 0,
        })
      }
    }
  },

  // ----- 其他信息 -----

  // 显示编辑其他信息表单
  showEditOtherInfoForm() {
    // 查找当前年龄在选项中的索引
    let ageIndex = this.data.ageOptions.findIndex(a => a === this.data.otherInfo.age)
    // 不设置默认值，保持为-1表示未选择

    // 查找当前身高在选项中的索引
    let heightIndex = this.data.heightOptions.findIndex(h => h === this.data.otherInfo.height)
    // 不设置默认值，保持为-1表示未选择

    // 查找当前体重在选项中的索引
    let weightIndex = this.data.weightOptions.findIndex(w => w === this.data.otherInfo.weight)
    // 不设置默认值，保持为-1表示未选择

    this.setData({
      showOtherInfoForm: true,
      ageIndex,
      heightIndex,
      weightIndex,
      otherInfoForm: {
        age: this.data.otherInfo.age || '',
        height: this.data.otherInfo.height || '',
        weight: this.data.otherInfo.weight || '',
      },
    })
  },

  // 隐藏其他信息表单
  hideOtherInfoForm() {
    this.setData({
      showOtherInfoForm: false,
    })
  },

  // 处理年龄选择变化
  onAgeChange(e) {
    const ageIndex = parseInt(e.detail.value)
    const age = this.data.ageOptions[ageIndex]

    this.setData({
      ageIndex,
      'otherInfoForm.age': age,
    })
  },

  // 清除年龄
  clearAge() {
    this.setData({
      ageIndex: -1,
      'otherInfoForm.age': '',
    })
  },

  // 处理身高选择变化
  onHeightChange(e) {
    const heightIndex = parseInt(e.detail.value)
    const height = this.data.heightOptions[heightIndex]

    this.setData({
      heightIndex,
      'otherInfoForm.height': height,
    })
  },

  // 清除身高
  clearHeight() {
    this.setData({
      heightIndex: -1,
      'otherInfoForm.height': '',
    })
  },

  // 处理体重选择变化
  onWeightChange(e) {
    const weightIndex = parseInt(e.detail.value)
    const weight = this.data.weightOptions[weightIndex]

    this.setData({
      weightIndex,
      'otherInfoForm.weight': weight,
    })
  },

  // 清除体重
  clearWeight() {
    this.setData({
      weightIndex: -1,
      'otherInfoForm.weight': '',
    })
  },

  // 保存其他健康信息
  saveOtherInfo() {
    // 获取表单数据
    const { age, height, weight } = this.data.otherInfoForm

    // 更新本地数据
    this.setData({
      otherInfo: {
        age,
        height,
        weight,
      },
      showOtherInfoForm: false,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt('otherInfo', this.data.otherInfo)

    wx.showToast({
      title: '信息已保存',
      icon: 'success',
    })
  },

  // ----- 过敏信息 -----

  // 显示添加过敏信息表单
  showAddAllergyForm() {
    this.setData({
      showAllergyForm: true,
      allergyForm: {
        allergy: '',
      },
    })
  },

  // 隐藏过敏信息表单
  hideAllergyForm() {
    this.setData({
      showAllergyForm: false,
    })
  },

  // 处理过敏信息输入变化
  onAllergyInputChange(e) {
    this.setData({
      'allergyForm.allergy': e.detail.value,
    })
  },

  // 快速添加过敏信息
  quickAddAllergy(e) {
    const allergy = e.currentTarget.dataset.value

    // 获取当前过敏信息列表
    let allergyInfo = [...this.data.allergyInfo]

    // 检查是否已存在相同的过敏信息
    if (allergyInfo.includes(allergy)) {
      wx.showToast({
        title: '该过敏信息已存在',
        icon: 'none',
      })
      return
    }

    // 添加新的过敏信息
    allergyInfo.push(allergy)

    // 更新本地数据
    this.setData({
      allergyInfo,
    })

    // 更新 提示词
    this.updateHealthRecordsAndPrompt('allergyInfo', this.data.allergyInfo)

    wx.showToast({
      title: '过敏信息已添加',
      icon: 'success',
    })
  },

  // 保存过敏信息
  saveAllergy() {
    const allergy = this.data.allergyForm.allergy.trim()

    if (allergy) {
      // 获取当前过敏信息列表
      let allergyInfo = [...this.data.allergyInfo]

      // 检查是否已存在相同的过敏信息
      if (allergyInfo.includes(allergy)) {
        wx.showToast({
          title: '该过敏信息已存在',
          icon: 'none',
        })
        return
      }

      // 添加新的过敏信息
      allergyInfo.push(allergy)

      // 更新本地数据
      this.setData({
        allergyInfo,
        'allergyForm.allergy': '',
        showAllergyForm: false,
      })

      // 更新提示词
      this.updateHealthRecordsAndPrompt('allergyInfo', this.data.allergyInfo)
    }
    this.setData({
      showAllergyForm: false,
    })
  },

  // 删除过敏信息
  deleteAllergy(e) {
    const index = e.currentTarget.dataset.index

    // 获取当前过敏信息列表
    let allergyInfo = [...this.data.allergyInfo]

    // 删除指定的过敏信息
    allergyInfo.splice(index, 1)

    // 更新本地数据
    this.setData({
      allergyInfo,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt('allergyInfo', this.data.allergyInfo)

    wx.showToast({
      title: '已删除',
      icon: 'success',
    })
  },

  // ----- 饮食偏好 -----

  // 显示添加饮食偏好表单
  showAddDietPreferenceForm() {
    this.setData({
      showDietPreferenceForm: true,
      dietPreferenceForm: {
        preference: '',
      },
    })
  },

  // 隐藏饮食偏好表单
  hideDietPreferenceForm() {
    this.setData({
      showDietPreferenceForm: false,
    })
  },

  // 处理饮食偏好输入变化
  onDietPreferenceInputChange(e) {
    this.setData({
      'dietPreferenceForm.preference': e.detail.value,
    })
  },

  // 快速添加饮食偏好
  quickAddDietPreference(e) {
    const preference = e.currentTarget.dataset.value

    // 获取当前饮食偏好列表
    let dietPreference = [...this.data.dietPreference]

    // 检查是否已存在相同的饮食偏好
    if (dietPreference.includes(preference)) {
      wx.showToast({
        title: '该饮食偏好已存在',
        icon: 'none',
      })
      return
    }

    // 添加新的饮食偏好
    dietPreference.push(preference)

    // 更新本地数据
    this.setData({
      dietPreference,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt('dietPreference', this.data.dietPreference)

    wx.showToast({
      title: '饮食偏好已添加',
      icon: 'success',
    })
  },

  // 保存饮食偏好
  saveDietPreference() {
    const preference = this.data.dietPreferenceForm.preference.trim()

    if (preference) {
      // 获取当前饮食偏好列表
      let dietPreference = [...this.data.dietPreference]

      // 检查是否已存在相同的饮食偏好
      if (dietPreference.includes(preference)) {
        wx.showToast({
          title: '该饮食偏好已存在',
          icon: 'none',
        })
        return
      }

      // 添加新的饮食偏好
      dietPreference.push(preference)

      // 更新页面数据
      this.setData({
        dietPreference,
        'dietPreferenceForm.preference': '',
        showDietPreferenceForm: false,
      })

      // 更新提示词
      this.updateHealthRecordsAndPrompt('dietPreference', this.data.dietPreference)
    }
    this.setData({
      showDietPreferenceForm: false,
    })
  },

  // 删除饮食偏好
  deleteDietPreference(e) {
    const index = e.currentTarget.dataset.index

    // 获取当前饮食偏好列表
    let dietPreference = [...this.data.dietPreference]

    // 删除指定的饮食偏好
    dietPreference.splice(index, 1)

    // 更新本地数据
    this.setData({
      dietPreference,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt('dietPreference', this.data.dietPreference)

    wx.showToast({
      title: '已删除',
      icon: 'success',
    })
  },

  // =============================================
  // 体征记录相关函数
  // =============================================

  // 添加新记录
  addNewRecord() {
    wx.showActionSheet({
      itemList: ['添加体征记录', '添加用药记录', '添加产检记录'],
      success: res => {
        if (res.tapIndex === 0) {
          // 添加体征记录
          this.showAddVitalsForm()
        } else if (res.tapIndex === 1) {
          // 添加用药记录
          this.showAddMedicationForm()
        } else if (res.tapIndex === 2) {
          // 添加产检记录
          this.uploadCheckupRecord()
        }
      },
    })
  },

  // 查看详情
  viewDetail(e) {
    const type = e.currentTarget.dataset.type
    const index = e.currentTarget.dataset.index
    let recordData
    let typeKey

    // 根据类型获取对应的记录数据
    switch (type) {
      case '血压':
        recordData = this.data.bloodPressureRecords[index]
        typeKey = 'bloodPressure'
        break
      case '体重':
        recordData = this.data.weightRecords[index]
        typeKey = 'weight'
        break
      case '血糖':
        recordData = this.data.bloodSugarRecords[index]
        typeKey = 'bloodSugar'
        break
      case '体温':
        recordData = this.data.temperatureRecords[index]
        typeKey = 'temperature'
        break
      case '心率':
        recordData = this.data.heartRateRecords[index]
        typeKey = 'heartRate'
        break
      case '胎动':
        recordData = this.data.fetalMovementRecords[index]
        typeKey = 'fetalMovement'
        break
    }

    // 构建详情内容
    let content = `日期：${recordData.date || '未记录'}\n`
    if (recordData.time) {
      content += `时间：${recordData.time}\n`
    }
    content += `数值：${recordData.value} ${this.getUnitByType(type)}\n`
    if (recordData.notes) {
      content += `备注：${recordData.notes}`
    }

    wx.showActionSheet({
      itemList: ['查看详情', '编辑记录', '删除记录'],
      success: res => {
        if (res.tapIndex === 0) {
          // 查看详情
          wx.showModal({
            title: `${type}记录详情`,
            content: content,
            showCancel: false,
          })
        } else if (res.tapIndex === 1) {
          // 编辑记录
          const typeIndex = this.getVitalsTypeIndex(type)
          const valueOptions = this.data.vitalsTypes[typeIndex].valueOptions
          let valueIndex = valueOptions.findIndex(option => option === recordData.value)

          // 如果找不到匹配的值，使用默认值
          if (valueIndex === -1) {
            valueIndex = Math.floor(valueOptions.length / 2)
          }

          this.setData({
            showVitalsForm: true,
            editingVitals: true,
            editingVitalsIndex: index,
            editingVitalsType: typeKey,
            currentVitalsTypeName: this.data.vitalsTypes[typeIndex].name,
            vitalsTypeIndex: typeIndex,
            vitalsValueIndex: valueIndex,
            vitalsForm: {
              type: typeKey,
              value: recordData.value,
              date: recordData.date || '',
              time: recordData.time || '',
              notes: recordData.notes || '',
            },
          })
        } else if (res.tapIndex === 2) {
          // 删除记录
          this.deleteVitals({
            currentTarget: {
              dataset: {
                index: index,
                type: typeKey,
              },
            },
          })
        }
      },
    })
  },

  // 根据类型获取单位
  getUnitByType(type) {
    const vitalsType = this.data.vitalsTypes.find(item => item.name === type)
    return vitalsType ? vitalsType.unit : ''
  },

  // 根据类型获取索引
  getVitalsTypeIndex(type) {
    return this.data.vitalsTypes.findIndex(item => item.key === type)
  },

  // 显示体征记录表单
  showVitalsForm() {
    this.setData({
      showVitalsForm: true,
      editingVitals: false,
      editingVitalsIndex: -1,
      editingVitalsType: '',
    })
  },

  // 显示编辑体征记录表单
  showEditVitalsForm(e) {
    const index = e.currentTarget.dataset.index
    let recordsKey = this.getVitalsRecordsKey(this.data.editingVitalsType)
    const record = this.data[recordsKey][index]
    const typeIndex = this.getVitalsTypeIndexByKey(this.data.editingVitalsType)

    // 查找当前值在选项中的索引
    const valueOptions = this.data.vitalsTypes[typeIndex].valueOptions
    let valueIndex = valueOptions.findIndex(option => option === record.value)

    // 如果找不到匹配的值，使用默认值
    if (valueIndex === -1) {
      valueIndex = Math.floor(valueOptions.length / 2)
    }

    this.setData({
      showVitalsForm: true,
      editingVitals: true,
      editingVitalsIndex: index,
      currentVitalsTypeName: this.data.vitalsTypes[typeIndex].name,
      vitalsTypeIndex: typeIndex,
      vitalsValueIndex: valueIndex,
      vitalsForm: {
        type: this.data.editingVitalsType,
        value: record.value,
        date: record.date || '',
        time: record.time || '',
        notes: record.notes || '',
      },
    })
  },

  // 隐藏体征记录表单
  hideVitalsForm() {
    this.setData({
      showVitalsForm: false,
    })
  },

  // 处理体征记录表单输入变化
  onVitalsInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value

    this.setData({
      [`vitalsForm.${field}`]: value,
    })
  },

  // 处理体征记录日期选择变化
  onVitalsDateChange(e) {
    this.setData({
      'vitalsForm.date': e.detail.value,
    })
  },

  // 处理体征记录时间选择变化
  onVitalsTimeChange(e) {
    this.setData({
      'vitalsForm.time': e.detail.value,
    })
  },

  // 处理体征记录类型选择变化
  onVitalsTypeChange(e) {
    const typeIndex = parseInt(e.detail.value)
    const typeName = this.data.vitalsTypes[typeIndex].name
    const typeKey = this.getTypeKeyByName(typeName)

    this.setData({
      vitalsTypeIndex: typeIndex,
      editingVitalsType: typeKey,
      currentVitalsTypeName: typeName,
    })
  },

  // 处理体征记录数值选择变化
  onVitalsValueChange(e) {
    const valueIndex = parseInt(e.detail.value)
    const value = this.data.vitalsTypes[this.data.vitalsTypeIndex].valueOptions[valueIndex]

    this.setData({
      vitalsValueIndex: valueIndex,
      'vitalsForm.value': value,
    })
  },

  // 保存体征记录
  saveVitals() {
    const { type, value, date, time, notes } = this.data.vitalsForm

    // 验证必填字段
    if (!value || !date) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none',
      })
      return
    }

    // 获取当前体征记录类型对应的记录数组
    const recordsKey = this.getVitalsRecordsKey(this.data.editingVitalsType)
    let records = [...this.data[recordsKey]]

    // 准备新的体征记录
    const newVitals = {
      date: date,
      time: time,
      value: value,
      notes: notes,
    }

    if (this.data.editingVitals) {
      // 编辑现有记录
      records[this.data.editingVitalsIndex] = newVitals
    } else {
      // 添加新记录
      records.push(newVitals)
    }

    // 更新本地数据
    this.setData({
      [recordsKey]: records,
      showVitalsForm: false,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt(this.data.editingVitalsType, this.data[recordsKey])

    wx.showToast({
      title: '体征记录已保存',
      icon: 'success',
    })
  },

  // 删除体征记录
  deleteVitals(e) {
    const type = e.currentTarget.dataset.type
    const index = e.currentTarget.dataset.index

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条体征记录吗？',
      success: res => {
        if (res.confirm) {
          // 获取当前体征记录类型对应的记录数组
          const recordsKey = this.getVitalsRecordsKey(type)
          let records = [...this.data[recordsKey]]

          // 删除指定记录
          records.splice(index, 1)

          // 更新本地数据
          this.setData({
            [recordsKey]: records,
          })

          // 更新提示词
          this.updateHealthRecordsAndPrompt(type, this.data[recordsKey])

          wx.showToast({
            title: '体征记录已删除',
            icon: 'success',
          })
        }
      },
    })
  },

  // 显示添加体征记录表单
  showAddVitalsForm(e) {
    // 获取当前日期
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}`

    // 获取当前时间
    const hours = String(today.getHours()).padStart(2, '0')
    const minutes = String(today.getMinutes()).padStart(2, '0')
    const formattedTime = `${hours}:${minutes}`

    // 如果是从添加按钮点击进来
    if (e && e.currentTarget && e.currentTarget.dataset.type) {
      const typeKey = e.currentTarget.dataset.type
      const typeIndex = this.getVitalsTypeIndexByKey(typeKey)

      // 设置默认值索引为中间值
      const valueOptions = this.data.vitalsTypes[typeIndex].valueOptions
      const defaultValueIndex = Math.floor(valueOptions.length / 2)

      this.setData({
        showVitalsForm: true,
        editingVitals: false,
        editingVitalsIndex: -1,
        editingVitalsType: typeKey,
        currentVitalsTypeName: this.data.vitalsTypes[typeIndex].name,
        vitalsTypeIndex: typeIndex,
        vitalsValueIndex: defaultValueIndex,
        vitalsForm: {
          type: typeKey,
          value: valueOptions[defaultValueIndex],
          date: formattedDate,
          time: formattedTime,
          notes: '',
        },
      })
    } else {
      // 显示体征类型选择
      wx.showActionSheet({
        itemList: this.data.vitalsTypes.map(item => item.name),
        success: res => {
          const selectedType = this.data.vitalsTypes[res.tapIndex]
          const typeKey = this.getTypeKeyByName(selectedType.name)

          // 设置默认值索引为中间值
          const valueOptions = selectedType.valueOptions
          const defaultValueIndex = Math.floor(valueOptions.length / 2)

          this.setData({
            showVitalsForm: true,
            editingVitals: false,
            editingVitalsIndex: -1,
            editingVitalsType: typeKey,
            currentVitalsTypeName: selectedType.name,
            vitalsTypeIndex: res.tapIndex,
            vitalsValueIndex: defaultValueIndex,
            vitalsForm: {
              type: typeKey,
              value: valueOptions[defaultValueIndex],
              date: formattedDate,
              time: formattedTime,
              notes: '',
            },
          })
        },
      })
    }
  },

  // 根据类型键获取索引
  getVitalsTypeIndexByKey(typeKey) {
    switch (typeKey) {
      case 'bloodPressure':
        return 0
      case 'weight':
        return 1
      case 'bloodSugar':
        return 2
      case 'temperature':
        return 3
      case 'heartRate':
        return 4
      case 'fetalMovement':
        return 5
      default:
        return 0
    }
  },

  // 根据名称获取类型键
  getTypeKeyByName(name) {
    switch (name) {
      case '血压':
        return 'bloodPressure'
      case '体重':
        return 'weight'
      case '血糖':
        return 'bloodSugar'
      case '体温':
        return 'temperature'
      case '心率':
        return 'heartRate'
      case '胎动':
        return 'fetalMovement'
      default:
        return ''
    }
  },

  // =============================================
  // 用药记录相关函数
  // =============================================

  // 显示添加用药表单
  showAddMedicationForm() {
    // 获取当前日期作为默认开始日期
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const formattedDate = `${year}-${month}-${day}`

    this.setData({
      showMedicationForm: true,
      editingMedication: false,
      editingMedicationIndex: -1,
      medicationForm: {
        name: '',
        typeIndex: -1,
        dosage: '',
        frequency: '',
        timeIndex: -1,
        startDate: formattedDate,
        endDate: '',
        notes: '',
      },
    })
  },

  // 显示编辑用药表单
  showEditMedicationForm(e) {
    const index = e.currentTarget.dataset.index
    const medication = this.data.medications[index]

    // 查找药物类型索引
    let typeIndex = -1
    if (medication.type) {
      typeIndex = this.data.medicationTypes.findIndex(type => type === medication.type)
    }

    // 查找服用时间索引
    let timeIndex = -1
    if (medication.time) {
      timeIndex = this.data.medicationTimes.findIndex(time => time === medication.time)
    }

    this.setData({
      showMedicationForm: true,
      editingMedication: true,
      editingMedicationIndex: index,
      medicationForm: {
        name: medication.name,
        typeIndex: typeIndex,
        dosage: medication.dosage,
        frequency: medication.frequency,
        timeIndex: timeIndex,
        startDate: medication.startDate || '',
        endDate: medication.endDate || '',
        notes: medication.notes || '',
      },
    })
  },

  // 隐藏用药表单
  hideMedicationForm() {
    this.setData({
      showMedicationForm: false,
    })
  },

  // 处理用药表单输入变化
  onMedicationInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value

    this.setData({
      [`medicationForm.${field}`]: value,
    })
  },

  // 处理药物类型选择变化
  onMedicationTypeChange(e) {
    this.setData({
      'medicationForm.typeIndex': parseInt(e.detail.value),
    })
  },

  // 处理服用时间选择变化
  onMedicationTimeChange(e) {
    this.setData({
      'medicationForm.timeIndex': parseInt(e.detail.value),
    })
  },

  // 处理开始日期选择变化
  onStartDateChange(e) {
    this.setData({
      'medicationForm.startDate': e.detail.value,
    })
  },

  // 处理结束日期选择变化
  onEndDateChange(e) {
    this.setData({
      'medicationForm.endDate': e.detail.value,
    })
  },

  // 保存用药记录
  saveMedication() {
    const { name, typeIndex, dosage, frequency, timeIndex, startDate, endDate, notes } =
      this.data.medicationForm

    // 验证必填字段
    if (!name || !dosage || !frequency) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none',
      })
      return
    }

    // 准备新的用药记录
    const newMedication = {
      name: name,
      type: typeIndex >= 0 ? this.data.medicationTypes[typeIndex] : '',
      dosage: dosage,
      frequency: frequency,
      time: timeIndex >= 0 ? this.data.medicationTimes[timeIndex] : '',
      startDate: startDate,
      endDate: endDate,
      notes: notes,
    }

    // 获取当前用药记录列表
    let medications = [...this.data.medications]

    if (this.data.editingMedication) {
      // 编辑现有记录
      medications[this.data.editingMedicationIndex] = newMedication
    } else {
      // 添加新记录
      medications.push(newMedication)
    }

    // 更新本地数据
    this.setData({
      medications,
      showMedicationForm: false,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt('medications', this.data.medications)
  },

  // 删除用药记录
  deleteMedication(e) {
    const index = e.currentTarget.dataset.index

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条用药记录吗？',
      success: res => {
        if (res.confirm) {
          // 获取当前用药记录列表
          let medications = [...this.data.medications]

          // 删除指定记录
          medications.splice(index, 1)

          // 更新本地数据
          this.setData({
            medications,
          })

          // 获取当前健康记录
          const healthRecords = wx.getStorageSync('healthRecords') || {}

          // 更新用药记录
          healthRecords.medications = medications

          // 保存到本地存储
          wx.setStorageSync('healthRecords', healthRecords)

          wx.showToast({
            title: '用药已删除',
            icon: 'success',
          })
        }
      },
    })
  },

  // =============================================
  // 产检记录相关函数
  // =============================================

  // 上传产检记录照片
  uploadCheckupRecord() {
    // 如果未登录或未完善个人信息，提示用户
    if (!this.data.isLoggedIn || !this.data.hasPersonalInfo) {
      wx.showToast({
        title: '请先登录并完善个人信息',
        icon: 'none',
      })
      return
    }

    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: res => {
        const tempFilePath = res.tempFiles[0].tempFilePath

        // 显示加载提示
        wx.showLoading({
          title: '正在识别...',
        })

        // 上传到云存储进行临时处理
        this.uploadImageForOCR(tempFilePath)
      },
    })
  },

  // 上传图片到云存储进行OCR识别
  uploadImageForOCR(filePath) {
    const cloudPath = `temp_ocr/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`

    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        // 获取图片的云存储路径
        const fileID = res.fileID

        // 调用OCR识别
        this.recognizeCheckupRecord(fileID)
      },
      fail: err => {
        wx.hideLoading()
        wx.showToast({
          title: '上传失败',
          icon: 'none',
        })
        console.error('上传产检记录失败', err)
      },
    })
  },

  // 识别产检记录
  recognizeCheckupRecord(fileID) {
    // 调用云函数进行OCR识别
    wx.cloud.callFunction({
      name: 'ocrCheckupRecord',
      data: {
        fileID: fileID,
      },
      success: res => {
        // 获取OCR识别结果
        const ocrResult = res.result || {}

        // 删除临时上传的图片
        this.deleteTemporaryImage(fileID)

        // 使用DeepSeek模型分析OCR结果
        if (ocrResult.text) {
          this.analyzeCheckupRecord(ocrResult.text)
        } else {
          wx.hideLoading()
          wx.showToast({
            title: '未能识别文字',
            icon: 'none',
          })
        }
      },
      fail: err => {
        // OCR识别失败
        this.deleteTemporaryImage(fileID)

        wx.hideLoading()
        wx.showToast({
          title: '识别失败',
          icon: 'none',
        })
        console.error('OCR识别产检记录失败', err)
      },
    })
  },

  // 删除临时上传的图片
  deleteTemporaryImage(fileID) {
    wx.cloud.deleteFile({
      fileList: [fileID],
      success: res => {
        console.log('删除临时图片成功', res)
      },
      fail: err => {
        console.error('删除临时图片失败', err)
      },
    })
  },

  // 分析产检记录
  analyzeCheckupRecord(ocrText) {
    // 调用云函数使用DeepSeek模型分析
    wx.cloud.callFunction({
      name: 'analyzeCheckupRecord',
      data: {
        ocrText: ocrText,
      },
      success: res => {
        // 获取分析结果
        const analysis = res.result || {}

        // 保存分析结果
        this.saveCheckupAnalysis(analysis.summary, analysis.date)

        wx.hideLoading()
        wx.showToast({
          title: '识别成功',
          icon: 'success',
        })
      },
      fail: err => {
        wx.hideLoading()
        wx.showToast({
          title: '分析失败',
          icon: 'none',
        })
        console.error('分析产检记录失败', err)
      },
    })
  },

  // 保存产检记录分析结果
  saveCheckupAnalysis(analysisText, date) {
    // 创建一个新的记录对象
    const newRecord = {
      date: date,
      week: this.calculateWeekFromDate(date),
      hospital: '通过OCR识别',
      doctor: '未知',
      items: [],
      notes: analysisText,
    }

    // 获取当前产检记录
    let checkupRecords = [...this.data.checkupRecords]

    // 检查是否已存在相同日期的记录
    const existingIndex = checkupRecords.findIndex(record => record.date === date)

    if (existingIndex === -1) {
      // 添加新记录
      checkupRecords.push(newRecord)
    } else {
      // 更新已有记录
      checkupRecords[existingIndex] = {
        ...checkupRecords[existingIndex],
        notes: analysisText,
      }
    }

    // 更新页面数据
    this.setData({
      checkupRecords: checkupRecords,
      checkupAnalysis: analysisText,
    })

    // 更新提示词
    this.updateHealthRecordsAndPrompt('checkupRecords', this.data.checkupRecords)

    // 更新健康记录
    this.updateHealthRecords()

    console.log('产检记录分析结果已保存')
  },

  // 根据日期计算孕周
  calculateWeekFromDate(dateStr) {
    // 解析日期字符串
    const date = new Date(dateStr)
    const today = new Date()
    const pregnancyInfo = this.data.pregnancyInfo || {}

    // 如果有预产期信息，使用预产期计算
    if (pregnancyInfo.dueDate) {
      const dueDate = new Date(pregnancyInfo.dueDate)

      // 计算检查日期与今天的差距（天数）
      const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24))

      // 当前孕周
      const currentWeek = pregnancyInfo.week || 0

      // 检查日期的孕周 = 当前孕周 - (今天 - 检查日期的天数) / 7
      let checkupWeek = Math.round(currentWeek - diffDays / 7)

      // 确保孕周在有效范围内
      checkupWeek = Math.max(1, Math.min(40, checkupWeek))

      return checkupWeek
    }

    // 如果没有预产期信息，返回默认值
    return 0
  },

  // 预览产检记录照片
  previewCheckupRecord(e) {
    // 此方法已不再需要，因为我们不再保存照片
    // 保留方法以避免可能的引用错误
  },

  // 删除产检记录照片
  deleteCheckupRecord(e) {
    // 此方法已不再需要，因为我们不再保存照片
    // 保留方法以避免可能的引用错误
  },

  // =============================================
  // 健康记录和提示词集中保存
  // =============================================

  // 更新提示词
  async updateHealthRecordsAndPrompt(updateType, partialRecords) {
    try {
      // 检查全局提示词对象是否存在
      if (!app.globalData.prompt) {
        app.globalData.prompt = {
          prefix: promptService.getDefaultPrompt(),
          healthRecords: '',
        }
      }

      // 使用 promptService 中的 updatePartialRcordsPrompt 函数更新提示词
      const oldPrompt = app.globalData.prompt.healthRecords || ''
      const updatedPrompt = promptService.updatePartialRcordsPrompt(
        oldPrompt,
        updateType,
        partialRecords
      )

      // 更新全局提示词对象中的健康记录部分
      app.globalData.prompt.healthRecords = updatedPrompt

      // 保存到本地存储
      try {
        // 使用解构赋值提取属性
        const healthRecords = FIELDS.reduce((acc, field) => {
          acc[field] = this.data[field]
          return acc
        }, {})

        wx.setStorage({
          key: `healthRecords`,
          data: healthRecords,
        })

        wx.setStorage({
          key: `prompt_healthRecords`,
          data: updatedPrompt,
        })
      } catch (error) {
        console.error('更新健康记录和提示词失败:', error)
      }

      Logger.info('提示词已更新', updatedPrompt)
    } catch (e) {
      Logger.error('更新健康记录和提示词失败:', e)
    }
  },

  // 获取体征记录对应的数据键名
  getVitalsRecordsKey(type) {
    const typeMap = {
      bloodPressure: 'bloodPressureRecords',
      weight: 'weightRecords',
      bloodSugar: 'bloodSugarRecords',
      temperature: 'temperatureRecords',
      heartRate: 'heartRateRecords',
      fetalMovement: 'fetalMovementRecords',
    }
    return typeMap[type] || ''
  },
})
