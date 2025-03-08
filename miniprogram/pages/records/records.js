// pages/records/records.js
const app = getApp()

Page({
  data: {
    activeTab: 0,
    tabs: ['基本信息', '体征记录', '用药记录', '产检记录'],
    healthRecords: {},
    pregnancyInfo: {},
    vitalsRecords: {
      bloodPressure: [],
      weight: [],
      bloodSugar: [],
      temperature: [],
      heartRate: [],
      fetalMovement: []
    },
    medications: [],
    checkupRecords: [],
    notes: [],
    isLoggedIn: false,
    hasPersonalInfo: false,
    
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
      notes: ''
    },
    medicationTypes: ['处方药', '非处方药', '保健品', '中药', '其他'],
    medicationTimes: ['饭前', '饭后', '睡前', '早晨', '中午', '晚上', '需要时'],
    
    // 体征记录表单
    showVitalsForm: false,
    editingVitals: false,
    editingVitalsIndex: -1,
    editingVitalsType: '',
    vitalsForm: {
      type: '',
      value: '',
      date: '',
      time: '',
      notes: ''
    },
    vitalsTypes: [
      { 
        name: '血压', 
        unit: 'mmHg', 
        placeholder: '如：120/80',
        valueOptions: [
          '90/60', '95/65', '100/70', '105/75', '110/70', '110/75', '115/75',
          '120/80', '125/80', '125/85', '130/80', '130/85', '130/90',
          '135/85', '135/90', '140/90', '145/90', '145/95', '150/95'
        ]
      },
      { 
        name: '体重', 
        unit: 'kg', 
        placeholder: '如：65.5',
        valueOptions: Array.from({length: 81}, (_, i) => (40 + i * 0.5).toFixed(1))  // 40kg - 80kg，步长0.5kg
      },
      { 
        name: '血糖', 
        unit: 'mmol/L', 
        placeholder: '如：5.6',
        valueOptions: Array.from({length: 61}, (_, i) => (3.0 + i * 0.1).toFixed(1))  // 3.0 - 9.0，步长0.1
      },
      { 
        name: '体温', 
        unit: '°C', 
        placeholder: '如：36.5',
        valueOptions: Array.from({length: 21}, (_, i) => (35.5 + i * 0.1).toFixed(1))  // 35.5 - 37.5，步长0.1
      },
      { 
        name: '心率', 
        unit: '次/分', 
        placeholder: '如：75',
        valueOptions: Array.from({length: 81}, (_, i) => (40 + i).toString())  // 40 - 120，步长1
      },
      { 
        name: '胎动', 
        unit: '次/小时', 
        placeholder: '如：10',
        valueOptions: Array.from({length: 31}, (_, i) => i.toString())  // 0 - 30，步长1
      }
    ],
    vitalsTypeIndex: 0,
    vitalsValueIndex: 0,
    
    // 过敏信息表单相关
    showAllergyForm: false,
    allergyForm: {
      allergy: ''
    },
    
    // 饮食偏好表单相关
    showDietPreferenceForm: false,
    dietPreferenceForm: {
      preference: ''
    }
  },

  onLoad() {
    // 初始化体征记录为空
    this.setData({
      vitalsRecords: {
        bloodPressure: [],
        weight: [],
        bloodSugar: [],
        temperature: [],
        heartRate: [],
        fetalMovement: []
      },
      medications: [],
      checkupRecords: []
    })
    
    // 检查用户登录状态
    this.checkLoginStatus()
  },
  
  onShow() {
    // 每次显示页面时检查登录状态
    this.checkLoginStatus()
  },
  
  // 检查用户登录状态和个人信息
  checkLoginStatus() {
    const isLoggedIn = app.globalData.isLoggedIn
    const hasPersonalInfo = app.globalData.hasPersonalInfo
    
    this.setData({
      isLoggedIn: isLoggedIn,
      hasPersonalInfo: hasPersonalInfo
    })
    
    // 如果用户已登录且已完善个人信息，加载健康记录
    if (isLoggedIn && hasPersonalInfo) {
      this.loadHealthRecords()
    } else {
      // 如果用户未登录或未完善个人信息，确保体征记录为空
      this.setData({
        vitalsRecords: {
          bloodPressure: [],
          weight: [],
          bloodSugar: [],
          temperature: [],
          heartRate: [],
          fetalMovement: []
        },
        medications: [],
        checkupRecords: []
      })
    }
  },
  
  // 加载健康记录
  loadHealthRecords() {
    // 初始化空的健康记录结构
    let healthRecords = {}
    let pregnancyInfo = {
      week: '',
      dueDate: '',
      lastCheckup: ''
    }
    let vitalsRecords = {
      bloodPressure: [],
      weight: [],
      bloodSugar: [],
      temperature: [],
      heartRate: [],
      fetalMovement: []
    }
    let medications = []
    let checkupRecords = []
    
    // 从本地存储获取健康记录
    const storedRecords = wx.getStorageSync('healthRecords')
    
    if (storedRecords) {
      // 如果本地存储中有健康记录，使用它
      healthRecords = storedRecords
      
      // 设置孕期信息
      pregnancyInfo = {
        week: healthRecords.pregnancy ? healthRecords.pregnancy.week : '',
        dueDate: healthRecords.pregnancy ? healthRecords.pregnancy.dueDate : '',
        lastCheckup: healthRecords.pregnancy ? healthRecords.pregnancy.lastCheckup : ''
      }
      
      // 设置体征记录 - 确保所有字段都初始化为空数组
      vitalsRecords = {
        bloodPressure: healthRecords.vitals && healthRecords.vitals.bloodPressure ? healthRecords.vitals.bloodPressure : [],
        weight: healthRecords.vitals && healthRecords.vitals.weight ? healthRecords.vitals.weight : [],
        bloodSugar: healthRecords.vitals && healthRecords.vitals.bloodSugar ? healthRecords.vitals.bloodSugar : [],
        temperature: healthRecords.vitals && healthRecords.vitals.temperature ? healthRecords.vitals.temperature : [],
        heartRate: healthRecords.vitals && healthRecords.vitals.heartRate ? healthRecords.vitals.heartRate : [],
        fetalMovement: healthRecords.vitals && healthRecords.vitals.fetalMovement ? healthRecords.vitals.fetalMovement : []
      }
      
      // 设置用药记录
      medications = healthRecords.medications || []
      
      // 设置产检记录
      checkupRecords = healthRecords.checkupRecords || []
    } else if (app.globalData.healthRecords) {
      // 如果全局数据中有健康记录，使用它
      healthRecords = app.globalData.healthRecords
      
      // 设置孕期信息
      pregnancyInfo = {
        week: healthRecords.pregnancy ? healthRecords.pregnancy.week : '',
        dueDate: healthRecords.pregnancy ? healthRecords.pregnancy.dueDate : '',
        lastCheckup: healthRecords.pregnancy ? healthRecords.pregnancy.lastCheckup : ''
      }
      
      // 设置体征记录 - 确保所有字段都初始化为空数组
      vitalsRecords = {
        bloodPressure: healthRecords.vitals && healthRecords.vitals.bloodPressure ? healthRecords.vitals.bloodPressure : [],
        weight: healthRecords.vitals && healthRecords.vitals.weight ? healthRecords.vitals.weight : [],
        bloodSugar: healthRecords.vitals && healthRecords.vitals.bloodSugar ? healthRecords.vitals.bloodSugar : [],
        temperature: healthRecords.vitals && healthRecords.vitals.temperature ? healthRecords.vitals.temperature : [],
        heartRate: healthRecords.vitals && healthRecords.vitals.heartRate ? healthRecords.vitals.heartRate : [],
        fetalMovement: healthRecords.vitals && healthRecords.vitals.fetalMovement ? healthRecords.vitals.fetalMovement : []
      }
      
      // 设置用药记录
      medications = healthRecords.medications || []
      
      // 设置产检记录
      checkupRecords = healthRecords.checkupRecords || []
    } else {
      // 如果全局数据中没有健康记录，则初始化一个空的健康记录
      healthRecords = {
        pregnancy: pregnancyInfo,
        vitals: vitalsRecords,
        medications: medications,
        checkupRecords: checkupRecords,
        allergies: [],
        dietPreferences: []
      }
      
      // 更新全局数据
      app.globalData.healthRecords = healthRecords
      
      // 保存到本地存储
      wx.setStorage({
        key: 'healthRecords',
        data: healthRecords
      })
    }
    
    this.setData({
      healthRecords,
      pregnancyInfo,
      vitalsRecords,
      medications,
      checkupRecords
    })
  },

  // 切换标签页
  switchTab(e) {
    const index = e.currentTarget.dataset.index
    this.setData({
      activeTab: index
    })
  },

  // 添加新记录
  addNewRecord() {
    wx.showActionSheet({
      itemList: ['添加体征记录', '添加用药记录', '添加产检记录'],
      success: (res) => {
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
      }
    })
  },

  // 查看详情
  viewDetail(e) {
    const type = e.currentTarget.dataset.type
    const index = e.currentTarget.dataset.index
    let recordData
    let typeKey
    
    // 根据类型获取对应的记录数据
    switch(type) {
      case '血压':
        recordData = this.data.vitalsRecords.bloodPressure[index]
        typeKey = 'bloodPressure'
        break
      case '体重':
        recordData = this.data.vitalsRecords.weight[index]
        typeKey = 'weight'
        break
      case '血糖':
        recordData = this.data.vitalsRecords.bloodSugar[index]
        typeKey = 'bloodSugar'
        break
      case '体温':
        recordData = this.data.vitalsRecords.temperature[index]
        typeKey = 'temperature'
        break
      case '心率':
        recordData = this.data.vitalsRecords.heartRate[index]
        typeKey = 'heartRate'
        break
      case '胎动':
        recordData = this.data.vitalsRecords.fetalMovement[index]
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
      success: (res) => {
        if (res.tapIndex === 0) {
          // 查看详情
          wx.showModal({
            title: `${type}记录详情`,
            content: content,
            showCancel: false
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
            vitalsTypeIndex: typeIndex,
            vitalsValueIndex: valueIndex,
            vitalsForm: {
              type: typeKey,
              value: recordData.value,
              date: recordData.date || '',
              time: recordData.time || '',
              notes: recordData.notes || ''
            }
          })
        } else if (res.tapIndex === 2) {
          // 删除记录
          this.deleteVitals({
            currentTarget: {
              dataset: {
                index: index,
                type: typeKey
              }
            }
          })
        }
      }
    })
  },
  
  // 根据类型获取单位
  getUnitByType(type) {
    const vitalsType = this.data.vitalsTypes.find(item => item.name === type)
    return vitalsType ? vitalsType.unit : ''
  },
  
  // 根据类型获取索引
  getVitalsTypeIndex(type) {
    return this.data.vitalsTypes.findIndex(item => item.key === type);
  },
  
  // 导航到个人中心页面
  navigateToProfile() {
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  // 上传产检记录照片
  uploadCheckupRecord() {
    // 如果未登录或未完善个人信息，提示用户
    if (!this.data.isLoggedIn || !this.data.hasPersonalInfo) {
      wx.showToast({
        title: '请先登录并完善个人信息',
        icon: 'none'
      });
      return;
    }
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 显示加载提示
        wx.showLoading({
          title: '正在识别...',
        });
        
        // 上传到云存储进行临时处理
        this.uploadImageForOCR(tempFilePath);
      }
    });
  },
  
  // 上传图片到云存储进行OCR识别
  uploadImageForOCR(filePath) {
    const cloudPath = `temp_ocr/${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        // 获取图片的云存储路径
        const fileID = res.fileID;
        
        // 调用OCR识别
        this.recognizeCheckupRecord(fileID);
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
        console.error('上传产检记录失败', err);
      }
    });
  },
  
  // 识别产检记录
  recognizeCheckupRecord(fileID) {
    // 调用云函数进行OCR识别
    wx.cloud.callFunction({
      name: 'ocrCheckupRecord',
      data: {
        fileID: fileID
      },
      success: res => {
        // 获取OCR识别结果
        const ocrResult = res.result || {};
        
        // 删除临时上传的图片
        this.deleteTemporaryImage(fileID);
        
        // 使用DeepSeek模型分析OCR结果
        if (ocrResult.text) {
          this.analyzeCheckupRecord(ocrResult.text);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '未能识别文字',
            icon: 'none'
          });
        }
      },
      fail: err => {
        // OCR识别失败
        this.deleteTemporaryImage(fileID);
        
        wx.hideLoading();
        wx.showToast({
          title: '识别失败',
          icon: 'none'
        });
        console.error('OCR识别产检记录失败', err);
      }
    });
  },
  
  // 删除临时上传的图片
  deleteTemporaryImage(fileID) {
    wx.cloud.deleteFile({
      fileList: [fileID],
      success: res => {
        console.log('删除临时图片成功', res);
      },
      fail: err => {
        console.error('删除临时图片失败', err);
      }
    });
  },
  
  // 分析产检记录
  analyzeCheckupRecord(ocrText) {
    // 调用云函数使用DeepSeek模型分析
    wx.cloud.callFunction({
      name: 'analyzeCheckupRecord',
      data: {
        ocrText: ocrText
      },
      success: res => {
        // 获取分析结果
        const analysis = res.result || {};
        
        // 保存分析结果
        this.saveCheckupAnalysis(analysis.summary, analysis.date);
        
        wx.hideLoading();
        wx.showToast({
          title: '识别成功',
          icon: 'success'
        });
      },
      fail: err => {
        wx.hideLoading();
        wx.showToast({
          title: '分析失败',
          icon: 'none'
        });
        console.error('分析产检记录失败', err);
      }
    });
  },
  
  // 保存产检记录分析结果
  saveCheckupAnalysis(analysisText, date) {
    // 获取当前的健康记录
    const healthRecords = this.data.healthRecords || app.globalData.healthRecords || {};
    
    // 更新分析结果
    healthRecords.checkupAnalysis = analysisText;
    
    // 如果有日期信息，可以添加到产检记录中
    if (date) {
      // 确保checkupRecords存在
      if (!healthRecords.checkupRecords) {
        healthRecords.checkupRecords = [];
      }
      
      // 检查是否已存在相同日期的记录
      const existingIndex = healthRecords.checkupRecords.findIndex(record => record.date === date);
      
      if (existingIndex === -1) {
        // 添加新记录
        healthRecords.checkupRecords.push({
          date: date,
          week: this.calculateWeekFromDate(date),
          hospital: '通过OCR识别',
          doctor: '未知',
          items: [],
          notes: analysisText
        });
      }
    }
    
    // 更新全局数据
    app.globalData.healthRecords = healthRecords;
    
    // 保存到本地存储
    wx.setStorageSync('healthRecords', healthRecords);
    
    // 更新页面数据
    this.setData({
      healthRecords: healthRecords
    });
  },
  
  // 根据日期计算孕周
  calculateWeekFromDate(dateStr) {
    // 解析日期字符串
    const date = new Date(dateStr);
    const today = new Date();
    const pregnancyInfo = this.data.pregnancyInfo || {};
    
    // 如果有预产期信息，使用预产期计算
    if (pregnancyInfo.dueDate) {
      const dueDate = new Date(pregnancyInfo.dueDate);
      
      // 计算检查日期与今天的差距（天数）
      const diffDays = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      
      // 当前孕周
      const currentWeek = pregnancyInfo.week || 0;
      
      // 检查日期的孕周 = 当前孕周 - (今天 - 检查日期的天数) / 7
      let checkupWeek = Math.round(currentWeek - diffDays / 7);
      
      // 确保孕周在有效范围内
      checkupWeek = Math.max(1, Math.min(40, checkupWeek));
      
      return checkupWeek;
    }
    
    // 如果没有预产期信息，返回默认值
    return 0;
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
        notes: ''
      }
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
        notes: medication.notes || ''
      }
    })
  },
  
  // 隐藏用药表单
  hideMedicationForm() {
    this.setData({
      showMedicationForm: false
    })
  },
  
  // 处理用药表单输入变化
  onMedicationInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    this.setData({
      [`medicationForm.${field}`]: value
    })
  },
  
  // 处理药物类型选择变化
  onMedicationTypeChange(e) {
    this.setData({
      'medicationForm.typeIndex': parseInt(e.detail.value)
    })
  },
  
  // 处理服用时间选择变化
  onMedicationTimeChange(e) {
    this.setData({
      'medicationForm.timeIndex': parseInt(e.detail.value)
    })
  },
  
  // 处理开始日期选择变化
  onStartDateChange(e) {
    this.setData({
      'medicationForm.startDate': e.detail.value
    })
  },
  
  // 处理结束日期选择变化
  onEndDateChange(e) {
    this.setData({
      'medicationForm.endDate': e.detail.value
    })
  },
  
  // 保存用药记录
  saveMedication() {
    const { name, typeIndex, dosage, frequency, timeIndex, startDate, endDate, notes } = this.data.medicationForm
    
    // 验证必填字段
    if (!name || !dosage || !frequency) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
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
      notes: notes
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
      showMedicationForm: false
    })
    
    // 更新全局数据
    if (app.globalData.healthRecords) {
      app.globalData.healthRecords.medications = medications
      
      // 保存到本地存储
      wx.setStorage({
        key: 'healthRecords',
        data: app.globalData.healthRecords
      })
    }
    
    wx.showToast({
      title: this.data.editingMedication ? '用药已更新' : '用药已添加',
      icon: 'success'
    })
  },
  
  // 删除用药记录
  deleteMedication(e) {
    const index = e.currentTarget.dataset.index
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条用药记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 获取当前用药记录列表
          let medications = [...this.data.medications]
          
          // 删除指定记录
          medications.splice(index, 1)
          
          // 更新本地数据
          this.setData({
            medications
          })
          
          // 更新全局数据
          if (app.globalData.healthRecords) {
            app.globalData.healthRecords.medications = medications
            
            // 保存到本地存储
            wx.setStorage({
              key: 'healthRecords',
              data: app.globalData.healthRecords
            })
          }
          
          wx.showToast({
            title: '用药已删除',
            icon: 'success'
          })
        }
      }
    })
  },

  // 显示体征记录表单
  showVitalsForm() {
    this.setData({
      showVitalsForm: true,
      editingVitals: false,
      editingVitalsIndex: -1,
      editingVitalsType: ''
    })
  },
  
  // 显示编辑体征记录表单
  showEditVitalsForm(e) {
    const index = e.currentTarget.dataset.index
    const vitals = this.data.vitalsRecords[this.data.editingVitalsType]
    const typeIndex = this.getVitalsTypeIndexByKey(this.data.editingVitalsType)
    
    // 查找当前值在选项中的索引
    const valueOptions = this.data.vitalsTypes[typeIndex].valueOptions
    let valueIndex = valueOptions.findIndex(option => option === vitals[index].value)
    
    // 如果找不到匹配的值，使用默认值
    if (valueIndex === -1) {
      valueIndex = Math.floor(valueOptions.length / 2)
    }
    
    this.setData({
      showVitalsForm: true,
      editingVitals: true,
      editingVitalsIndex: index,
      vitalsTypeIndex: typeIndex,
      vitalsValueIndex: valueIndex,
      vitalsForm: {
        type: this.data.editingVitalsType,
        value: vitals[index].value,
        date: vitals[index].date || '',
        time: vitals[index].time || '',
        notes: vitals[index].notes || ''
      }
    })
  },
  
  // 隐藏体征记录表单
  hideVitalsForm() {
    this.setData({
      showVitalsForm: false
    })
  },
  
  // 处理体征记录表单输入变化
  onVitalsInputChange(e) {
    const field = e.currentTarget.dataset.field
    const value = e.detail.value
    
    this.setData({
      [`vitalsForm.${field}`]: value
    })
  },
  
  // 处理体征记录日期选择变化
  onVitalsDateChange(e) {
    this.setData({
      'vitalsForm.date': e.detail.value
    })
  },
  
  // 处理体征记录时间选择变化
  onVitalsTimeChange(e) {
    this.setData({
      'vitalsForm.time': e.detail.value
    })
  },
  
  // 处理体征记录类型选择变化
  onVitalsTypeChange(e) {
    this.setData({
      'editingVitalsType': e.detail.value
    })
  },
  
  // 处理体征记录数值选择变化
  onVitalsValueChange(e) {
    const valueIndex = parseInt(e.detail.value)
    const value = this.data.vitalsTypes[this.data.vitalsTypeIndex].valueOptions[valueIndex]
    
    this.setData({
      vitalsValueIndex: valueIndex,
      'vitalsForm.value': value
    })
  },
  
  // 保存体征记录
  saveVitals() {
    const { type, value, date, time, notes } = this.data.vitalsForm
    
    // 验证必填字段
    if (!value || !date) {
      wx.showToast({
        title: '请填写必填字段',
        icon: 'none'
      })
      return
    }
    
    // 获取当前体征记录列表
    let vitals = [...this.data.vitalsRecords[this.data.editingVitalsType]]
    
    // 准备新的体征记录
    const newVitals = {
      date: date,
      time: time,
      value: value,
      notes: notes
    }
    
    if (this.data.editingVitals) {
      // 编辑现有记录
      vitals[this.data.editingVitalsIndex] = newVitals
    } else {
      // 添加新记录
      vitals.push(newVitals)
    }
    
    // 更新本地数据
    const updatedVitalsRecords = {
      ...this.data.vitalsRecords,
      [this.data.editingVitalsType]: vitals
    }
    
    this.setData({
      vitalsRecords: updatedVitalsRecords,
      showVitalsForm: false
    })
    
    // 更新全局数据
    if (app.globalData.healthRecords) {
      if (!app.globalData.healthRecords.vitals) {
        app.globalData.healthRecords.vitals = {}
      }
      
      app.globalData.healthRecords.vitals = updatedVitalsRecords
      
      // 保存到本地存储
      wx.setStorage({
        key: 'healthRecords',
        data: app.globalData.healthRecords
      })
    }
    
    wx.showToast({
      title: this.data.editingVitals ? '体征记录已更新' : '体征记录已添加',
      icon: 'success'
    })
  },
  
  // 删除体征记录
  deleteVitals(e) {
    const index = e.currentTarget.dataset.index
    const type = e.currentTarget.dataset.type
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条体征记录吗？',
      success: (res) => {
        if (res.confirm) {
          // 获取当前体征记录列表
          let vitals = [...this.data.vitalsRecords[type]]
          
          // 删除指定记录
          vitals.splice(index, 1)
          
          // 更新本地数据
          const updatedVitalsRecords = {
            ...this.data.vitalsRecords,
            [type]: vitals
          }
          
          this.setData({
            vitalsRecords: updatedVitalsRecords
          })
          
          // 更新全局数据
          if (app.globalData.healthRecords) {
            if (!app.globalData.healthRecords.vitals) {
              app.globalData.healthRecords.vitals = {}
            }
            
            app.globalData.healthRecords.vitals = updatedVitalsRecords
            
            // 保存到本地存储
            wx.setStorage({
              key: 'healthRecords',
              data: app.globalData.healthRecords
            })
          }
          
          wx.showToast({
            title: '体征记录已删除',
            icon: 'success'
          })
        }
      }
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
        vitalsTypeIndex: typeIndex,
        vitalsValueIndex: defaultValueIndex,
        vitalsForm: {
          type: typeKey,
          value: valueOptions[defaultValueIndex],
          date: formattedDate,
          time: formattedTime,
          notes: ''
        }
      })
    } else {
      // 显示体征类型选择
      wx.showActionSheet({
        itemList: this.data.vitalsTypes.map(item => item.name),
        success: (res) => {
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
            vitalsTypeIndex: res.tapIndex,
            vitalsValueIndex: defaultValueIndex,
            vitalsForm: {
              type: typeKey,
              value: valueOptions[defaultValueIndex],
              date: formattedDate,
              time: formattedTime,
              notes: ''
            }
          })
        }
      })
    }
  },
  
  // 根据类型键获取索引
  getVitalsTypeIndexByKey(typeKey) {
    switch(typeKey) {
      case 'bloodPressure': return 0
      case 'weight': return 1
      case 'bloodSugar': return 2
      case 'temperature': return 3
      case 'heartRate': return 4
      case 'fetalMovement': return 5
      default: return 0
    }
  },
  
  // 根据名称获取类型键
  getTypeKeyByName(name) {
    switch(name) {
      case '血压': return 'bloodPressure'
      case '体重': return 'weight'
      case '血糖': return 'bloodSugar'
      case '体温': return 'temperature'
      case '心率': return 'heartRate'
      case '胎动': return 'fetalMovement'
      default: return ''
    }
  },

  // 显示添加过敏信息表单
  showAddAllergyForm() {
    this.setData({
      showAllergyForm: true,
      allergyForm: {
        allergy: ''
      }
    })
  },
  
  // 隐藏过敏信息表单
  hideAllergyForm() {
    this.setData({
      showAllergyForm: false
    })
  },
  
  // 处理过敏信息输入变化
  onAllergyInputChange(e) {
    this.setData({
      'allergyForm.allergy': e.detail.value
    })
  },
  
  // 保存过敏信息
  saveAllergy() {
    const allergy = this.data.allergyForm.allergy.trim()
    
    if (!allergy) {
      wx.showToast({
        title: '请输入过敏信息',
        icon: 'none'
      })
      return
    }
    
    // 获取当前过敏信息列表
    let allergies = this.data.healthRecords.allergies || []
    
    // 检查是否已存在相同的过敏信息
    if (allergies.includes(allergy)) {
      wx.showToast({
        title: '该过敏信息已存在',
        icon: 'none'
      })
      return
    }
    
    // 添加新的过敏信息
    allergies.push(allergy)
    
    // 更新本地数据
    const healthRecords = { ...this.data.healthRecords, allergies }
    
    this.setData({
      healthRecords,
      showAllergyForm: false
    })
    
    // 更新全局数据
    if (app.globalData.healthRecords) {
      app.globalData.healthRecords.allergies = allergies
      
      // 保存到本地存储
      wx.setStorage({
        key: 'healthRecords',
        data: app.globalData.healthRecords
      })
    }
    
    wx.showToast({
      title: '过敏信息已添加',
      icon: 'success'
    })
  },
  
  // 显示添加饮食偏好表单
  showAddDietPreferenceForm() {
    this.setData({
      showDietPreferenceForm: true,
      dietPreferenceForm: {
        preference: ''
      }
    })
  },
  
  // 隐藏饮食偏好表单
  hideDietPreferenceForm() {
    this.setData({
      showDietPreferenceForm: false
    })
  },
  
  // 处理饮食偏好输入变化
  onDietPreferenceInputChange(e) {
    this.setData({
      'dietPreferenceForm.preference': e.detail.value
    })
  },
  
  // 保存饮食偏好
  saveDietPreference() {
    const preference = this.data.dietPreferenceForm.preference.trim()
    
    if (!preference) {
      wx.showToast({
        title: '请输入饮食偏好',
        icon: 'none'
      })
      return
    }
    
    // 获取当前饮食偏好列表
    let dietPreferences = this.data.healthRecords.dietPreferences || []
    
    // 检查是否已存在相同的饮食偏好
    if (dietPreferences.includes(preference)) {
      wx.showToast({
        title: '该饮食偏好已存在',
        icon: 'none'
      })
      return
    }
    
    // 添加新的饮食偏好
    dietPreferences.push(preference)
    
    // 更新本地数据
    const healthRecords = { ...this.data.healthRecords, dietPreferences }
    
    this.setData({
      healthRecords,
      showDietPreferenceForm: false
    })
    
    // 更新全局数据
    if (app.globalData.healthRecords) {
      app.globalData.healthRecords.dietPreferences = dietPreferences
      
      // 保存到本地存储
      wx.setStorage({
        key: 'healthRecords',
        data: app.globalData.healthRecords
      })
    }
    
    wx.showToast({
      title: '饮食偏好已添加',
      icon: 'success'
    })
  }
}) 