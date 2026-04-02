const NodeHelper = require('node_helper')
const axios = require('axios')
const fs = require('fs')
const path = require('path')

// Daily API request limit for free tier
const DAILY_REQUEST_LIMIT = 50

/**
 * Node Helper for MMM-YandexWeather
 *
 * This helper handles the backend communication with Yandex Weather API.
 * It processes GraphQL requests and returns weather data to the frontend module.
 */
module.exports = NodeHelper.create({
  /**
   * Start the node helper
   */
  start() {
    console.log(`Starting node helper for: ${this.name}`)
    this.rateLimitFile = path.join(__dirname, '.api_rate_limit.json')
    this.cacheFile = path.join(__dirname, '.weather_cache.json')
    this.loadRateLimit()
  },

  /**
   * Handle socket notifications from the module
   *
   * @param {string} notification - Notification identifier
   * @param {object} payload - Payload data
   */
  async socketNotificationReceived(notification, payload) {
    if (notification === 'FETCH_YANDEX_WEATHER') {
      await this.fetchYandexWeather(payload)
    }
  },

  /**
   * Load cached weather data from disk
   *
   * @returns {object|null} Parsed cache object or null if missing/invalid
   */
  loadCache() {
    try {
      if (!fs.existsSync(this.cacheFile)) return null
      const raw = fs.readFileSync(this.cacheFile, 'utf8')
      const cache = JSON.parse(raw)
      if (
        typeof cache.fetchedAt !== 'number'
        || typeof cache.lat !== 'number'
        || typeof cache.lon !== 'number'
        || typeof cache.data !== 'object'
        || cache.data === null
      ) {
        console.warn('YandexWeather: Cache file is invalid, ignoring')
        return null
      }
      return cache
    } catch (error) {
      console.warn('YandexWeather: Failed to load cache:', error.message)
      return null
    }
  },

  /**
   * Save weather data to disk cache
   *
   * @param {object} data - Raw API response data
   * @param {number} lat - Latitude used for this request
   * @param {number} lon - Longitude used for this request
   */
  saveCache(data, lat, lon) {
    try {
      const cache = { fetchedAt: Date.now(), lat, lon, data }
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache), 'utf8')
    } catch (error) {
      console.warn('YandexWeather: Failed to save cache:', error.message)
    }
  },

  /**
   * Check if cached data is still valid
   *
   * @param {object|null} cache - Cache object from loadCache()
   * @param {number} lat - Current latitude
   * @param {number} lon - Current longitude
   * @param {number} updateInterval - Update interval in milliseconds
   * @returns {boolean}
   */
  isCacheFresh(cache, lat, lon, updateInterval) {
    if (!cache) return false
    if (cache.lat !== lat || cache.lon !== lon) return false
    return Date.now() - cache.fetchedAt < updateInterval
  },

  /**
   * Fetch weather data from Yandex Weather API
   *
   * @param {object} config - Configuration object containing API key and query
   */
  async fetchYandexWeather(config) {
    const { apiKey, query, updateInterval, lat, lon } = config

    if (!apiKey) {
      console.error('YandexWeather: API key is missing')
      this.sendSocketNotification('YANDEX_WEATHER_ERROR', {
        error: 'API key is required',
      })
      return
    }

    const cache = this.loadCache()
    if (this.isCacheFresh(cache, lat, lon, updateInterval)) {
      const cacheAge = Date.now() - cache.fetchedAt
      console.log(`YandexWeather: Serving from cache (age: ${Math.round(cacheAge / 60000)} min)`)
      this.sendSocketNotification('YANDEX_WEATHER_DATA', {
        data: cache.data,
        fromCache: true,
        cacheAge,
      })
      return
    }

    try {
      const response = await this.makeYandexAPIRequest(query, apiKey)

      if (response && response.data) {
        this.saveCache(response.data, lat, lon)
        this.sendSocketNotification('YANDEX_WEATHER_DATA', {
          data: response.data,
          fromCache: false,
          cacheAge: 0,
        })
      } else {
        console.error('YandexWeather: Invalid response from API')
        this.sendSocketNotification('YANDEX_WEATHER_ERROR', {
          error: 'Invalid response from API',
        })
      }
    } catch (error) {
      console.error('YandexWeather: Error fetching weather data:', error.message)
      this.sendSocketNotification('YANDEX_WEATHER_ERROR', {
        error: error.message,
      })
    }
  },

  /**
   * Load rate limit data from file
   */
  loadRateLimit() {
    try {
      if (fs.existsSync(this.rateLimitFile)) {
        const data = fs.readFileSync(this.rateLimitFile, 'utf8')
        this.rateLimit = JSON.parse(data)
      } else {
        this.rateLimit = { date: this.getCurrentDate(), count: 0 }
      }
    } catch (error) {
      console.error('YandexWeather: Error loading rate limit:', error.message)
      this.rateLimit = { date: this.getCurrentDate(), count: 0 }
    }
  },

  /**
   * Save rate limit data to file
   */
  saveRateLimit() {
    try {
      fs.writeFileSync(this.rateLimitFile, JSON.stringify(this.rateLimit), 'utf8')
    } catch (error) {
      console.error('YandexWeather: Error saving rate limit:', error.message)
    }
  },

  /**
   * Get current date in YYYY-MM-DD format
   *
   * @returns {string} Current date
   */
  getCurrentDate() {
    const now = new Date()
    return now.toISOString().split('T')[0]
  },

  /**
   * Check if API rate limit is exceeded
   *
   * @returns {boolean} True if limit exceeded
   */
  isRateLimitExceeded() {
    const currentDate = this.getCurrentDate()

    // Reset counter if it's a new day
    if (this.rateLimit.date !== currentDate) {
      this.rateLimit = { date: currentDate, count: 0 }
      this.saveRateLimit()
    }

    return this.rateLimit.count >= DAILY_REQUEST_LIMIT
  },

  /**
   * Increment API request counter
   */
  incrementRateLimit() {
    this.rateLimit.count++
    this.saveRateLimit()
    console.log(`YandexWeather: API requests today: ${this.rateLimit.count}/${DAILY_REQUEST_LIMIT}`)
  },

  /**
   * Make a GraphQL request to Yandex Weather API
   *
   * @param {string} query - GraphQL query string
   * @param {string} apiKey - Yandex Weather API key
   * @returns {Promise<object>} API response data
   */
  async makeYandexAPIRequest(query, apiKey) {
    // Check rate limit
    if (this.isRateLimitExceeded()) {
      const resetDate = new Date()
      resetDate.setDate(resetDate.getDate() + 1)
      resetDate.setHours(0, 0, 0, 0)
      throw new Error(`Daily API limit reached (${DAILY_REQUEST_LIMIT} requests). Resets at midnight.`)
    }

    const url = 'https://api.weather.yandex.ru/graphql/query'

    const headers = {
      'X-Yandex-Weather-Key': apiKey,
      'Content-Type': 'application/json'
    }

    const requestBody = {
      query: query,
    }

    try {
      const response = await axios.post(url, requestBody, {
        headers,
        timeout: 10000, // 10 second timeout
      })

      // Increment rate limit counter after successful request
      this.incrementRateLimit()

      if (response.data && response.data.errors) {
        console.error('YandexWeather: GraphQL errors:', response.data.errors)
        throw new Error(`GraphQL error: ${response.data.errors[0].message}`)
      }

      return response.data
    } catch (error) {
      if (error.response) {
        // Server responded with error status
        console.error('YandexWeather: API error response:', error.response.status, error.response.data)
        throw new Error(`API error: ${error.response.status} - ${error.response.statusText}`)
      } else if (error.request) {
        // Request was made but no response received
        console.error('YandexWeather: No response from API')
        throw new Error('No response from API - check your internet connection')
      } else {
        // Error in request setup
        console.error('YandexWeather: Request error:', error.message)
        throw error
      }
    }
  },
})
