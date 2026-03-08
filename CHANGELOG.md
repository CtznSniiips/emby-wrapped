# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-03-08

### Added
- **URL Parameter Routing**: Added support for prefilled wrapped links using `/username?YYYY` and `/username?MM-YYYY` formats.
- **Community-Friendly URL Flow**: Added redirect handling for legacy shorthand URLs so existing links continue to work with the newer route flow.

### Changed
- **Period Selection UX**: Updated period formatting to `MM-YYYY`, added current-year quick selection, and made wrapped period labels dynamic across the UI.
- **Documentation Refresh**: Expanded setup and usage guidance in `README.md`, including updated container image details and URL parameter examples.

### Fixed
- **Community Stats Loading**: Resolved issues where prefilled user/time URLs could break or bypass the intended stats flow.
- **Binge Session Accuracy**: Corrected binge card calculations to use the right session window.
- **Year/Month Date Math**: Fixed lookback and timezone filtering issues that caused incomplete or incorrect current year/month statistics.
- **Journey Card Content**: Corrected date parsing, subtitle formatting, and insight text issues in monthly journey cards.
- **Yearly Stats Truncation**: Fixed data truncation caused by item detail fetch limits.

## [1.1.0] - 2026-02-04

### Added
- **Music Artist/Track Images**: Added support for displaying images for top artists and tracks in the music summary card.
- **Image Proxy Server**: Implemented `/api/proxy-image` to handle image fetching, solve CORS issues, and provide server-side caching.
- **Library Filtering**: Introduced `FILTER_USER_ID` environment variable to allow filtering content based on a specific Emby user's permissions (useful for hiding NSFW content).
- **Monthly Wrapped**: Added support for viewing statistics for individual months in addition to the full year.
- **Image Error Handling**: Improved robustness with reactive image error tracking and fallback placeholders.

### Changed
- **Higher Resolution Images**: Updated image fetching logic to request 400px images instead of 200px for better visual quality.
- **UI Enhancements**: Redesigned `MusicSummaryCard` to show top artists and songs side-by-side with larger thumbnails.
- **Improved Emby Integration**: Enhanced `EmbyClient` with methods to retrieve API base URL and key for more flexible image URL generation.
- **Caching**: Improved image caching mechanism with disk-based persistence in `/tmp` for production environments.

### Fixed
- **Image Loading Issues**: Fixed CORS and connection issues by proxying all media images through the server.
- **Layout Consistency**: Adjusted spacing and dimensions in summary cards for a more cohesive look.

---

## [1.0.0] - 2025-12-31

### Initial Release
- Basic Emby Wrapped functionality.
- Yearly statistics for movies and shows.
- Basic music statistics.
- Shareable image cards.
