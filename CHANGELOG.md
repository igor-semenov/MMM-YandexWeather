# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 - 2026-02-15

### Added
- Initial release of MMM-YandexWeather
- Integration with Yandex Weather API v3 (GraphQL)
- Current weather display with temperature, humidity, wind, and conditions
- Daily weather forecast (up to 10 days)
- Hourly weather forecast (up to 24 hours)
- Multi-language support (Russian and English)
- "Feels like" temperature display
- Customizable weather icons with optional coloring
- Configurable update intervals
- Fade effect for forecast items
- Multiple table size options (xsmall, small, medium, large, xlarge)
- Comprehensive error handling and logging
- Full documentation with configuration examples
- MIT License

### Features
- **Weather Data:**
  - Current temperature with "feels like" indication
  - Humidity percentage
  - Wind speed and direction
  - Weather condition descriptions with icons
  - Daily min/max temperatures
  - Hourly temperature predictions

- **Display Options:**
  - Toggle forecast sections on/off
  - Customize number of forecast days/hours
  - Show/hide individual data points (humidity, wind, etc.)
  - Round temperature values option
  - Fade effect for better visual hierarchy
  - Colored weather icons option

- **Localization:**
  - Russian language support
  - English language support
  - Translatable weather conditions

- **Technical:**
  - GraphQL API integration
  - Axios for HTTP requests
  - Error handling with user-friendly messages
  - API rate limit considerations
  - Configurable update intervals

### Developer Notes
- Built on MagicMirror² module template
- Uses Weather Icons font for weather condition display
- Follows MagicMirror² coding standards
- ESLint configuration included
- Modular code structure for easy maintenance

## Unreleased

### Planned for Future Releases
- Support for multiple locations
- Weather alerts and warnings
- Air quality index display
- UV index display
- Animated weather icons
- Historical weather data
- Weather charts and graphs
- Voice assistant integration
- Extended 10+ day forecasts
- Precipitation probability display
- More language translations
