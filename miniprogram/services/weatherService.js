/**
 * 天气和节气服务
 * 负责获取和管理天气和节气信息
 */

import Logger from '../utils/logger';
import appConfig from '../config/appConfig';

const { STORAGE_KEYS, API_CONFIG } = appConfig;

/**
 * 获取天气信息
 * @returns {Promise<Object>} 天气信息对象
 */
function getWeatherInfo() {
  return new Promise((resolve) => {
    // 检查上次获取天气的时间戳
    const lastWeatherTime = wx.getStorageSync(STORAGE_KEYS.LAST_WEATHER_TIME) || 0;
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000; // 一小时的毫秒数
    
    // 如果距离上次获取天气不足一小时，且已有天气数据，则使用缓存的天气数据
    if (currentTime - lastWeatherTime < oneHour && wx.getStorageSync(STORAGE_KEYS.WEATHER_INFO)) {
      const cachedWeatherInfo = wx.getStorageSync(STORAGE_KEYS.WEATHER_INFO);
      Logger.debug('使用缓存的天气数据', cachedWeatherInfo);
      resolve(cachedWeatherInfo);
      return;
    }
    
    // 先设置默认天气，以防获取失败
    const defaultWeather = {
      icon: '',
      temperature: '--'
    };
    
    // 检查用户是否已经被提醒过授权问题
    const hasLocationAuthReminded = wx.getStorageSync(STORAGE_KEYS.LOCATION_AUTH_REMINDED) || false;
    
    // 检查位置权限
    wx.getSetting({
      success: (res) => {
        if (res.authSetting['scope.userLocation']) {
          // 已授权，获取位置
          getLocationData(currentTime).then(weatherInfo => {
            resolve(weatherInfo);
          }).catch(() => {
            resolve(defaultWeather);
          });
        } else {
          // 未授权
          if (!hasLocationAuthReminded) {
            // 第一次提醒用户
            wx.showModal({
              title: '位置授权',
              content: '需要获取您的位置信息才能显示天气，请授权',
              confirmText: '去授权',
              cancelText: '取消',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.userLocation']) {
                        // 用户在设置页面授权了
                        getLocationData(currentTime).then(weatherInfo => {
                          resolve(weatherInfo);
                        }).catch(() => {
                          resolve(defaultWeather);
                        });
                      } else {
                        resolve(defaultWeather);
                      }
                      // 无论用户是否授权，都记录已经提醒过
                      wx.setStorageSync(STORAGE_KEYS.LOCATION_AUTH_REMINDED, true);
                    }
                  });
                } else {
                  // 用户取消，记录已经提醒过
                  wx.setStorageSync(STORAGE_KEYS.LOCATION_AUTH_REMINDED, true);
                  resolve(defaultWeather);
                }
              }
            });
          } else {
            // 已经提醒过，不再提示
            Logger.debug('用户未授权位置信息，且已经提醒过');
            resolve(defaultWeather);
          }
        }
      },
      fail: () => {
        resolve(defaultWeather);
      }
    });
  });
}

/**
 * 获取位置数据
 * @param {Number} currentTime - 当前时间戳
 * @returns {Promise<Object>} 天气信息对象
 */
function getLocationData(currentTime) {
  return new Promise((resolve, reject) => {
    wx.getLocation({
      type: 'wgs84',
      success: (res) => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        Logger.debug('获取位置成功', { latitude, longitude });
        
        // 调用当前天气API
        getCurrentWeather(latitude, longitude).then(weatherInfo => {
          // 更新天气获取时间戳
          wx.setStorageSync(STORAGE_KEYS.LAST_WEATHER_TIME, currentTime);
          resolve(weatherInfo);
        }).catch(err => {
          reject(err);
        });
      },
      fail: (err) => {
        Logger.error('获取位置失败', err);
        // 只在第一次获取失败时提示用户
        const hasLocationAuthReminded = wx.getStorageSync(STORAGE_KEYS.LOCATION_AUTH_REMINDED) || false;
        if (!hasLocationAuthReminded) {
          wx.showToast({
            title: '获取位置失败，使用默认天气',
            icon: 'none'
          });
          // 记录已经提醒过
          wx.setStorageSync(STORAGE_KEYS.LOCATION_AUTH_REMINDED, true);
        }
        reject(err);
      }
    });
  });
}

/**
 * 获取当前天气信息
 * @param {Number} latitude - 纬度
 * @param {Number} longitude - 经度
 * @returns {Promise<Object>} 天气信息对象
 */
function getCurrentWeather(latitude, longitude) {
  return new Promise((resolve, reject) => {
    // 使用OpenWeatherMap API获取当前天气
    const currentWeatherUrl = `${API_CONFIG.WEATHER_API_URL}?lat=${latitude}&lon=${longitude}&appid=${API_CONFIG.WEATHER_API_KEY}&units=metric`;
    
    wx.request({
      url: currentWeatherUrl,
      success: (currentRes) => {
        Logger.debug('获取当前天气数据成功', currentRes.data);
        
        if (currentRes.data && currentRes.data.cod === 200) {
          const currentWeatherData = currentRes.data;
          
          // 获取当前天气信息
          const weatherIcon = currentWeatherData.weather[0].icon;
          
          // 获取当前温度信息（已经通过units=metric参数转换为摄氏度）
          const temp = Math.round(currentWeatherData.main.temp);
          
          // 使用API返回的icon值作为图标文件名
          const iconUrl = `/images/weather/${weatherIcon}.png`;
          
          // 更新当前天气信息，只包含当前温度和天气图标
          const weatherInfo = {
            icon: iconUrl,
            temperature: temp
          };
          
          // 更新缓存的天气数据
          wx.setStorageSync(STORAGE_KEYS.WEATHER_INFO, weatherInfo);
          
          resolve(weatherInfo);
        } else {
          Logger.error('当前天气数据格式错误', currentRes.data);
          reject(new Error('天气数据格式错误'));
        }
      },
      fail: (err) => {
        Logger.error('获取当前天气数据失败', err);
        reject(err);
      }
    });
  });
}

/**
 * 获取节气信息
 * @returns {String} 当前节气名称
 */
function getSolarTermInfo() {
  const today = new Date();
  const month = today.getMonth() + 1; // 月份从0开始，需要+1
  const day = today.getDate();
  
  let solarTerm = '';
  
  // 简化的节气判断（实际应用中应该使用更精确的计算方法）
  if ((month === 2 && day >= 3 && day <= 5) || (month === 2 && day === 6 && today.getHours() < 12)) {
    solarTerm = '立春';
  } else if ((month === 2 && day >= 18 && day <= 20) || (month === 2 && day === 21 && today.getHours() < 12)) {
    solarTerm = '雨水';
  } else if ((month === 3 && day >= 5 && day <= 7) || (month === 3 && day === 8 && today.getHours() < 12)) {
    solarTerm = '惊蛰';
  } else if ((month === 3 && day >= 20 && day <= 22) || (month === 3 && day === 23 && today.getHours() < 12)) {
    solarTerm = '春分';
  } else if ((month === 4 && day >= 4 && day <= 6) || (month === 4 && day === 7 && today.getHours() < 12)) {
    solarTerm = '清明';
  } else if ((month === 4 && day >= 19 && day <= 21) || (month === 4 && day === 22 && today.getHours() < 12)) {
    solarTerm = '谷雨';
  } else if ((month === 5 && day >= 5 && day <= 7) || (month === 5 && day === 8 && today.getHours() < 12)) {
    solarTerm = '立夏';
  } else if ((month === 5 && day >= 20 && day <= 22) || (month === 5 && day === 23 && today.getHours() < 12)) {
    solarTerm = '小满';
  } else if ((month === 6 && day >= 5 && day <= 7) || (month === 6 && day === 8 && today.getHours() < 12)) {
    solarTerm = '芒种';
  } else if ((month === 6 && day >= 21 && day <= 23) || (month === 6 && day === 24 && today.getHours() < 12)) {
    solarTerm = '夏至';
  } else if ((month === 7 && day >= 6 && day <= 8) || (month === 7 && day === 9 && today.getHours() < 12)) {
    solarTerm = '小暑';
  } else if ((month === 7 && day >= 22 && day <= 24) || (month === 7 && day === 25 && today.getHours() < 12)) {
    solarTerm = '大暑';
  } else if ((month === 8 && day >= 7 && day <= 9) || (month === 8 && day === 10 && today.getHours() < 12)) {
    solarTerm = '立秋';
  } else if ((month === 8 && day >= 22 && day <= 24) || (month === 8 && day === 25 && today.getHours() < 12)) {
    solarTerm = '处暑';
  } else if ((month === 9 && day >= 7 && day <= 9) || (month === 9 && day === 10 && today.getHours() < 12)) {
    solarTerm = '白露';
  } else if ((month === 9 && day >= 22 && day <= 24) || (month === 9 && day === 25 && today.getHours() < 12)) {
    solarTerm = '秋分';
  } else if ((month === 10 && day >= 8 && day <= 10) || (month === 10 && day === 11 && today.getHours() < 12)) {
    solarTerm = '寒露';
  } else if ((month === 10 && day >= 23 && day <= 25) || (month === 10 && day === 26 && today.getHours() < 12)) {
    solarTerm = '霜降';
  } else if ((month === 11 && day >= 7 && day <= 9) || (month === 11 && day === 10 && today.getHours() < 12)) {
    solarTerm = '立冬';
  } else if ((month === 11 && day >= 22 && day <= 24) || (month === 11 && day === 25 && today.getHours() < 12)) {
    solarTerm = '小雪';
  } else if ((month === 12 && day >= 6 && day <= 8) || (month === 12 && day === 9 && today.getHours() < 12)) {
    solarTerm = '大雪';
  } else if ((month === 12 && day >= 21 && day <= 23) || (month === 12 && day === 24 && today.getHours() < 12)) {
    solarTerm = '冬至';
  } else if ((month === 1 && day >= 5 && day <= 7) || (month === 1 && day === 8 && today.getHours() < 12)) {
    solarTerm = '小寒';
  } else if ((month === 1 && day >= 20 && day <= 22) || (month === 1 && day === 23 && today.getHours() < 12)) {
    solarTerm = '大寒';
  } else {
    // 如果不在节气日期范围内，显示最近的节气
    if (month === 1 && day < 5) {
      solarTerm = '冬至后';
    } else if (month === 1 && day > 22) {
      solarTerm = '大寒后';
    } else if (month === 2 && day < 3) {
      solarTerm = '大寒后';
    } else if (month === 2 && day > 20) {
      solarTerm = '雨水后';
    } else {
      solarTerm = '节气间';
    }
  }
  
  Logger.debug('获取节气信息', solarTerm);
  return solarTerm;
}

export default {
  getWeatherInfo,
  getSolarTermInfo
}; 