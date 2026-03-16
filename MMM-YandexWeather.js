/* global Module */

/**
 * MagicMirror² Module: MMM-YandexWeather
 *
 * A MagicMirror² module for displaying weather information from Yandex Weather API v3.
 *
 * By isemenov
 * MIT Licensed.
 */
Module.register('MMM-YandexWeather', {
  /**
   * Default module configuration
   */
  defaults: {
    // Yandex Weather API key (required)
    apiKey: '',

    // Location coordinates
    lat: 55.75396, // Moscow latitude
    lon: 37.620393, // Moscow longitude

    // Update interval in milliseconds (default: 120 minutes = 24 requests/day for free tier)
    updateInterval: 120 * 60 * 1000,

    // Animation speed for DOM updates
    animationSpeed: 1000,

    // Language for labels
    lang: 'ru',

    // Show forecast section
    showForecast: true,

    // Maximum number of days to show in forecast
    maxNumberOfDays: 7,

    // Show hourly forecast
    showHourlyForecast: false,

    // Maximum number of hours to show
    maxHourlyForecastEntries: 12,

    // Show "feels like" temperature
    showFeelsLike: true,

    // Show humidity
    showHumidity: true,

    // Show wind information
    showWind: true,

    // Fade forecast items
    fade: true,

    // Fade point (0-1, where to start fading)
    fadePoint: 0.25,

    // Round temperature values
    roundTemp: true,

    // Show description
    showDescription: true,

    // Colored icons
    colored: false,

    // Table class (options: xsmall, small, medium, large, xlarge)
    tableClass: 'small'
  },

  /**
   * Required MagicMirror² version
   */
  requiresVersion: '2.1.0',

  /**
   * Module start sequence
   */
  start() {
    Log.info(`Starting module: ${this.name}`)

    // Validate API key
    if (!this.config.apiKey) {
      Log.error('YandexWeather: API key is not configured!')
      this.updateAvailable = false
      return
    }

    // Initialize variables
    this.weatherData = null
    this.forecastData = null
    this.hourlyData = null
    this.loaded = false
    this.error = null

    // Schedule first update
    this.scheduleUpdate(this.config.initialLoadDelay || 0)
  },

  /**
   * Override getScripts method
   */
  getScripts() {
    return ['moment.js']
  },

  /**
   * Override getStyles method
   */
  getStyles() {
    return ['font-awesome.css', 'weather-icons.css', 'yandexweather.css']
  },

  /**
   * Override getTranslations method
   */
  getTranslations() {
    return {
      en: 'translations/en.json',
      ru: 'translations/ru.json'
    }
  },

  /**
   * Schedule next update
   *
   * @param {number} delay - Delay in milliseconds
   */
  scheduleUpdate(delay) {
    let nextLoad = this.config.updateInterval
    if (typeof delay !== 'undefined' && delay >= 0) {
      nextLoad = delay
    }

    setTimeout(() => {
      this.updateWeather()
    }, nextLoad)
  },

  /**
   * Update weather data
   */
  updateWeather() {
    if (!this.config.apiKey) {
      Log.error('YandexWeather: Cannot update - API key missing')
      return
    }

    // Fetch current weather
    this.fetchCurrentWeather()

    // Fetch forecast if enabled
    if (this.config.showForecast) {
      this.fetchWeatherForecast()
    }

    // Fetch hourly if enabled
    if (this.config.showHourlyForecast) {
      this.fetchWeatherHourly()
    }

    // Schedule next update
    this.scheduleUpdate()
  },

  /**
   * Fetch current weather
   */
  fetchCurrentWeather() {
    const query = this.getCurrentWeatherQuery()
    this.sendSocketNotification('FETCH_YANDEX_WEATHER', {
      apiKey: this.config.apiKey,
      query: query,
      type: 'current'
    })
  },

  /**
   * Fetch weather forecast
   */
  fetchWeatherForecast() {
    const query = this.getForecastQuery()
    this.sendSocketNotification('FETCH_YANDEX_WEATHER', {
      apiKey: this.config.apiKey,
      query: query,
      type: 'forecast'
    })
  },

  /**
   * Fetch hourly forecast
   */
  fetchWeatherHourly() {
    const query = this.getHourlyQuery()
    this.sendSocketNotification('FETCH_YANDEX_WEATHER', {
      apiKey: this.config.apiKey,
      query: query,
      type: 'hourly'
    })
  },

  /**
   * Get current weather GraphQL query
   */
  getCurrentWeatherQuery() {
    return `{
      weatherByPoint(request: { lat: ${this.config.lat}, lon: ${this.config.lon} }) {
        now {
          temperature
          windSpeed
          windDirection
          condition
          icon(format: CODE)
          feelsLike
        }
        forecast {
          days(limit: 1) {
            sunriseTime
            sunsetTime
          }
        }
      }
    }`
  },

  /**
   * Get forecast GraphQL query
   */
  getForecastQuery() {
    return `{
      weatherByPoint(request: { lat: ${this.config.lat}, lon: ${this.config.lon} }) {
        forecast {
          days(limit: ${this.config.maxNumberOfDays}) {
            time
            parts {
              day {
                minTemperature
                maxTemperature
                condition
                icon(format: CODE)
              }
            }
          }
        }
      }
    }`
  },

  /**
   * Get hourly forecast GraphQL query
   */
  getHourlyQuery() {
    return `{
      weatherByPoint(request: { lat: ${this.config.lat}, lon: ${this.config.lon} }) {
        forecast {
          hours(limit: ${this.config.maxHourlyForecastEntries}) {
            time
            temperature
            condition
            icon(format: CODE)
            feelsLike
          }
        }
      }
    }`
  },

  /**
   * Handle socket notifications from node helper
   */
  socketNotificationReceived(notification, payload) {
    if (notification === 'YANDEX_WEATHER_DATA') {
      this.processWeatherData(payload)
    } else if (notification === 'YANDEX_WEATHER_ERROR') {
      this.processError(payload)
    }
  },

  /**
   * Process weather data from API
   */
  processWeatherData(payload) {
    const { data, type } = payload

    if (!data || !data.weatherByPoint) {
      Log.error('YandexWeather: Invalid data structure')
      return
    }

    if (type === 'current') {
      this.weatherData = data.weatherByPoint
      this.loaded = true
      this.error = null
    } else if (type === 'forecast') {
      this.forecastData = data.weatherByPoint.forecast
    } else if (type === 'hourly') {
      this.hourlyData = data.weatherByPoint.forecast
    }

    this.updateDom(this.config.animationSpeed)
  },

  /**
   * Process error from API
   */
  processError(payload) {
    Log.error('YandexWeather: Error -', payload.error)
    this.error = payload.error
    this.updateDom(this.config.animationSpeed)
  },

  /**
   * Override dom generator
   */
  getDom() {
    const wrapper = document.createElement('div')
    wrapper.className = 'yandexweather'

    // Show error if present
    if (this.error) {
      wrapper.innerHTML = `<div class="dimmed light small">${this.translate('ERROR')}: ${this.error}</div>`
      return wrapper
    }

    // Show loading message
    if (!this.loaded) {
      wrapper.innerHTML = `<div class="dimmed light small">${this.translate('LOADING')}</div>`
      return wrapper
    }

    // Show API key missing message
    if (!this.config.apiKey) {
      wrapper.innerHTML = `<div class="dimmed light small">${this.translate('API_KEY_MISSING')}</div>`
      return wrapper
    }

    // Create current weather section
    if (this.weatherData && this.weatherData.now) {
      wrapper.appendChild(this.renderCurrentWeather())
    }

    // Create forecast section
    if (this.config.showForecast && this.forecastData && this.forecastData.days) {
      wrapper.appendChild(this.renderForecast())
    }

    // Create hourly forecast section
    if (this.config.showHourlyForecast && this.hourlyData && this.hourlyData.hours) {
      wrapper.appendChild(this.renderHourlyForecast())
    }

    return wrapper
  },

  /**
   * Render current weather
   */
  renderCurrentWeather() {
    const current = this.weatherData.now
    const wrapper = document.createElement('div')
    wrapper.className = 'current-weather'

    // Temperature
    const tempWrapper = document.createElement('div')
    tempWrapper.className = 'large light'

    const temperature = this.config.roundTemp ? Math.round(current.temperature) : current.temperature.toFixed(1)
    tempWrapper.innerHTML = `${temperature}°`

    // Weather icon
    const iconClass = this.convertWeatherType(current.condition, current.icon)
    const icon = document.createElement('span')
    icon.className = `wi ${this.getWeatherIconClass(iconClass)}`
    if (this.config.colored) {
      icon.classList.add('colored')
    }

    // Feels like temperature
    let feelsLikeText = ''
    if (this.config.showFeelsLike && current.feelsLike !== undefined) {
      const feelsLike = this.config.roundTemp ? Math.round(current.feelsLike) : current.feelsLike.toFixed(1)
      feelsLikeText = ` (${this.translate('FEELS_LIKE')} ${feelsLike}°)`
    }

    // Main row: icon + temperature
    const mainRow = document.createElement('div')
    mainRow.className = 'main-row'
    mainRow.appendChild(icon)
    mainRow.appendChild(tempWrapper)

    wrapper.appendChild(mainRow)

    // Additional info
    const infoWrapper = document.createElement('div')
    infoWrapper.className = 'normal light small'

    const infoParts = []

    // Description
    if (this.config.showDescription) {
      infoParts.push(this.translate(`CONDITION_${current.condition.toUpperCase().replace(/-/g, '_')}`))
    }

    // Feels like
    if (feelsLikeText) {
      infoParts.push(feelsLikeText)
    }

    // Humidity (not available in free tier)
    // if (this.config.showHumidity && current.humidity) {
    //   infoParts.push(`${this.translate("HUMIDITY")}: ${current.humidity}%`)
    // }

    // Wind
    if (this.config.showWind) {
      infoParts.push(`${this.translate('WIND')}: ${current.windSpeed.toFixed(1)} ${this.translate('WIND_UNIT')}`)
    }

    infoWrapper.innerHTML = infoParts.join(' | ')
    wrapper.appendChild(infoWrapper)

    return wrapper
  },

  /**
   * Render forecast
   */
  renderForecast() {
    const wrapper = document.createElement('table')
    wrapper.className = `forecast-table ${this.config.tableClass}`

    for (let i = 0; i < this.forecastData.days.length; i++) {
      const day = this.forecastData.days[i]
      const dayPart = day.parts.day

      const row = document.createElement('tr')
      if (this.config.fade && this.config.fadePoint < 1) {
        if (this.config.fadePoint < 0) {
          this.config.fadePoint = 0
        }
        const startFade = this.forecastData.days.length * this.config.fadePoint
        if (i >= startFade) {
          row.style.opacity = 1 - (i - startFade) / (this.forecastData.days.length - startFade)
        }
      }

      // Date
      const dateCell = document.createElement('td')
      dateCell.className = 'day'
      const date = moment(day.time)
      dateCell.innerHTML = i === 0 ? this.translate('TODAY') : date.format('ddd')
      row.appendChild(dateCell)

      // Icon
      const iconCell = document.createElement('td')
      iconCell.className = 'icon'
      const iconClass = this.convertWeatherType(dayPart.condition, dayPart.icon)
      const icon = document.createElement('span')
      icon.className = `wi ${this.getWeatherIconClass(iconClass)}`
      if (this.config.colored) {
        icon.classList.add('colored')
      }
      iconCell.appendChild(icon)
      row.appendChild(iconCell)

      // Max temp
      const maxTempCell = document.createElement('td')
      maxTempCell.className = 'max-temp'
      const maxTemp = this.config.roundTemp ? Math.round(dayPart.maxTemperature) : dayPart.maxTemperature.toFixed(1)
      maxTempCell.innerHTML = `${maxTemp}°`
      row.appendChild(maxTempCell)

      // Min temp
      const minTempCell = document.createElement('td')
      minTempCell.className = 'min-temp dimmed'
      const minTemp = this.config.roundTemp ? Math.round(dayPart.minTemperature) : dayPart.minTemperature.toFixed(1)
      minTempCell.innerHTML = `${minTemp}°`
      row.appendChild(minTempCell)

      wrapper.appendChild(row)
    }

    return wrapper
  },

  /**
   * Render hourly forecast
   */
  renderHourlyForecast() {
    const wrapper = document.createElement('table')
    wrapper.className = `hourly-table ${this.config.tableClass}`

    for (let i = 0; i < this.hourlyData.hours.length; i++) {
      const hour = this.hourlyData.hours[i]

      const row = document.createElement('tr')

      // Time
      const timeCell = document.createElement('td')
      timeCell.className = 'time'
      timeCell.innerHTML = moment(hour.time).format('HH:00')
      row.appendChild(timeCell)

      // Icon
      const iconCell = document.createElement('td')
      iconCell.className = 'icon'
      const iconClass = this.convertWeatherType(hour.condition, hour.icon)
      const icon = document.createElement('span')
      icon.className = `wi ${this.getWeatherIconClass(iconClass)}`
      if (this.config.colored) {
        icon.classList.add('colored')
      }
      iconCell.appendChild(icon)
      row.appendChild(iconCell)

      // Temperature
      const tempCell = document.createElement('td')
      tempCell.className = 'temp'
      const temp = this.config.roundTemp ? Math.round(hour.temperature) : hour.temperature.toFixed(1)
      tempCell.innerHTML = `${temp}°`
      row.appendChild(tempCell)

      wrapper.appendChild(row)
    }

    return wrapper
  },

  /**
   * Convert Yandex weather condition to icon class
   */
  convertWeatherType(condition, icon) {
    // Normalize condition: lowercase and replace underscores with hyphens
    const normalizedCondition = condition ? condition.toLowerCase().replace(/_/g, '-') : ''
    const isNight = icon && icon.includes('n')

    const weatherTypes = {
      'clear': isNight ? 'night-clear' : 'day-sunny',
      'partly-cloudy': isNight ? 'night-partly-cloudy' : 'day-cloudy',
      'cloudy': 'cloudy',
      'overcast': 'cloudy',
      'drizzle': 'rain',
      'light-rain': 'rain',
      'rain': 'rain',
      'moderate-rain': 'rain',
      'heavy-rain': 'rain',
      'continuous-heavy-rain': 'rain',
      'showers': 'showers-day',
      'wet-snow': 'snow',
      'light-snow': 'snow',
      'snow': 'snow',
      'snow-showers': 'snow',
      'hail': 'hail',
      'thunderstorm': 'thunderstorm',
      'thunderstorm-with-rain': 'thunderstorm',
      'thunderstorm-with-hail': 'thunderstorm'
    }

    return weatherTypes[normalizedCondition] || 'na'
  },

  /**
   * Get weather icon CSS class
   */
  getWeatherIconClass(iconType) {
    return `wi-${iconType}`
  },
})
