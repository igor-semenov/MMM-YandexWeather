# MMM-YandexWeather

A [MagicMirror²](https://github.com/MagicMirrorOrg/MagicMirror) module for displaying weather information from [Yandex Weather API v3](https://yandex.ru/dev/weather/).

[![PR Checks](https://github.com/isemenov/MMM-YandexWeather/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/isemenov/MMM-YandexWeather/actions/workflows/pr-checks.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE.md)

## Features

- 🌡️ **Current weather** — temperature, "feels like", wind speed/direction
- 📅 **Daily forecast** — up to N days with min/max temperatures and icons
- ⏰ **Hourly forecast** — configurable number of hours (disabled by default)
- 🎨 **Customizable display** — colored icons, fade effects, table size
- 🌍 **Multi-language** — Russian and English
- 🔒 **Rate limit protection** — built-in 50 req/day counter for free tier

> **Note:** Humidity is not available in the Yandex Weather free tier and is not displayed.

## Screenshot

![Example of MMM-YandexWeather](./example_1.png)

## Prerequisites

- MagicMirror² version 2.1.0 or higher
- **Yandex Weather API key** (free tier supports up to 50 requests/day)

### Getting a Yandex Weather API Key

1. Go to [Yandex Weather API Console](https://yandex.ru/dev/weather/)
2. Sign in with your Yandex account (or create one)
3. Subscribe to the API service and choose a plan (free "Test" plan is available)
4. Generate and copy your API key

## Installation

```bash
cd ~/MagicMirror/modules
git clone https://github.com/isemenov/MMM-YandexWeather
cd MMM-YandexWeather
npm install --production
```

### Update

```bash
cd ~/MagicMirror/modules/MMM-YandexWeather
git pull
npm install --production
```

## Configuration

Add to the `modules` array in `config/config.js`:

### Minimal Configuration

```javascript
{
    module: 'MMM-YandexWeather',
    position: 'top_right',
    config: {
        apiKey: 'YOUR_YANDEX_WEATHER_API_KEY',
        lat: 55.75396,    // Your location latitude
        lon: 37.620393    // Your location longitude
    }
}
```

### Full Configuration

```javascript
{
    module: 'MMM-YandexWeather',
    position: 'top_right',
    config: {
        // Required
        apiKey: 'YOUR_YANDEX_WEATHER_API_KEY',

        // Location
        lat: 55.75396,                    // Latitude (Moscow by default)
        lon: 37.620393,                   // Longitude (Moscow by default)

        // Update interval — keep at 3600000 (60 min) for free tier (50 req/day)
        updateInterval: 3600000,          // 60 minutes
        animationSpeed: 1000,             // Animation speed in ms
        lang: 'ru',                       // Language: 'ru' or 'en'

        // Forecast
        showForecast: true,               // Show daily forecast
        maxNumberOfDays: 7,               // Number of forecast days
        showHourlyForecast: false,        // Show hourly forecast
        maxHourlyForecastEntries: 12,     // Number of hourly entries

        // Display
        showFeelsLike: true,              // Show "feels like" temperature
        showWind: true,                   // Show wind speed and direction
        showDescription: true,            // Show weather condition text
        roundTemp: true,                  // Round temperatures to integers
        colored: false,                   // Colored weather icons
        fade: true,                       // Fade out forecast items
        fadePoint: 0.25,                  // Where fading starts (0–1)
        tableClass: 'small'               // Icon/text size: xsmall, small, medium, large, xlarge
    }
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **Required** | Yandex Weather API key |
| `lat` | `number` | `55.75396` | Location latitude |
| `lon` | `number` | `37.620393` | Location longitude |
| `updateInterval` | `number` | `3600000` | Update interval in ms (60 minutes — see [Rate Limits](#api-rate-limits)) |
| `animationSpeed` | `number` | `1000` | DOM update animation speed in ms |
| `lang` | `string` | `'ru'` | Display language: `'ru'` or `'en'` |
| `showForecast` | `boolean` | `true` | Show daily forecast section |
| `maxNumberOfDays` | `number` | `7` | Number of forecast days to display |
| `showHourlyForecast` | `boolean` | `false` | Show hourly forecast section |
| `maxHourlyForecastEntries` | `number` | `12` | Number of hourly entries to display |
| `showFeelsLike` | `boolean` | `true` | Show "feels like" temperature |
| `showWind` | `boolean` | `true` | Show wind speed and direction |
| `showDescription` | `boolean` | `true` | Show weather condition description |
| `roundTemp` | `boolean` | `true` | Round temperatures to integers |
| `colored` | `boolean` | `false` | Colored weather icons |
| `fade` | `boolean` | `true` | Fade out forecast/hourly items |
| `fadePoint` | `number` | `0.25` | Point where fading begins (0–1) |
| `tableClass` | `string` | `'small'` | Size class: `xsmall`, `small`, `medium`, `large`, `xlarge` |

## API Rate Limits

The Yandex Weather free tier allows **50 requests per day**. The module enforces this limit automatically:

- **Daily limit:** 50 requests (2 requests per update: current + forecast)
- **Default interval:** 60 minutes → **48 requests/day** ✅
- **Rate counter:** stored in `.api_rate_limit.json`, resets at midnight
- **On limit reached:** module shows an error until midnight

> ⚠️ If you enable hourly forecast (`showHourlyForecast: true`), each update uses **3 requests**. In that case set `updateInterval` to at least `5400000` (90 minutes) to stay within the limit.

### Requests per day by interval

| Interval | ms | Requests/day (forecast only) | Requests/day (+ hourly) |
|----------|----|------------------------------|--------------------------|
| 60 min | `3600000` | 48 ✅ | 72 ❌ |
| 90 min | `5400000` | 32 ✅ | 48 ✅ |
| 120 min | `7200000` | 24 ✅ | 36 ✅ |

## Finding Your Coordinates

1. Open [Google Maps](https://maps.google.com), right-click your location → copy coordinates
2. Or use [latlong.net](https://www.latlong.net/)

First number = `lat`, second = `lon`.

## Troubleshooting

### "API key is missing"
- Check that `apiKey` is set in your config
- Verify the key is active in Yandex API Console

### "Daily API limit reached"
- The free tier limit of 50 requests/day has been exhausted
- Module will resume automatically at midnight
- Increase `updateInterval` to prevent this in future

### Error or no data shown
- Verify API key and internet connection
- Check browser console (F12) for errors
- Check MagicMirror logs for backend errors

### Icons show N/A
- This was a known issue with condition names — fixed in v1.0.0
- Ensure you're on the latest version (`git pull`)

### Weather data not updating
- Check `updateInterval` setting
- Verify the rate limit hasn't been reached (check `.api_rate_limit.json`)

## Development

### Quality Checks

```bash
./check.sh           # Run all checks
./check.sh --fix     # Run checks and auto-fix issues
./check.sh --help    # Show usage
```

The script performs: linting, security audit, outdated dependencies, JSON validation, file checks, code issues detection, and git status.

### Available npm Scripts

```bash
npm run lint          # ESLint check
npm run lint:fix      # Auto-fix ESLint issues
npm run check         # Run all quality checks
npm run audit         # Security audit only
```

### CI/CD

GitHub Actions workflows run automatically:

- **On every PR** — linting, audit, structure check across Node.js 18/20/22
- **On version tag** (`v*.*.*`) — quality checks + GitHub Release with archive
- **Weekly (Monday)** — dependency check; creates issue if vulnerabilities found

See [`.github/workflows/`](.github/workflows/README.md) for details.

## Branding

Per Yandex Weather API terms: if weather data is publicly displayed, you may be required to show a "Powered by Yandex.Weather" notice. Check the [official documentation](https://yandex.ru/dev/weather/) for current requirements.

## Credits

- Weather data: [Yandex Weather API](https://yandex.ru/dev/weather/)
- Weather icons: [Weather Icons](https://erikflowers.github.io/weather-icons/)
- MagicMirror²: [MagicMirror Project](https://magicmirror.builders/)

## License

MIT — see [LICENSE.md](LICENSE.md).

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Run `./check.sh` to ensure code quality
4. Commit your changes (`git commit -m 'Add AmazingFeature'`)
5. Push to the branch (`git push origin feature/AmazingFeature`)
6. Open a Pull Request — CI checks will run automatically

## Support

- [Troubleshooting](#troubleshooting) section above
- [GitHub Issues](https://github.com/isemenov/MMM-YandexWeather/issues)
- [MagicMirror Forum](https://forum.magicmirror.builders/)
