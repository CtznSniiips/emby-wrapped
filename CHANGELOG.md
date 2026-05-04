# Changelog

All notable changes to this project will be documented in this file.

## [2.5.0] - 2026-05-04

### Fixed
- **"See Your Wrapped" button unresponsive**
- **Animation phase leak on rapid card navigation**

### Added
- **Navigation loading overlay**: Clicking "See Your Wrapped" triggers a full server-side data
  fetch that can take several seconds on a cold cache. The UI previously showed no feedback
  during this wait, making the button appear broken. Added a full-screen overlay that appears
  during any SvelteKit navigation, featuring a shimmer progress bar, spinner, and rotating
  fact carousel (see below).
- **Rotating fact carousel on loading screen**: While the personal wrapped page loads, the
  overlay cycles through a shuffled mix of generic watch-habit trivia and real server stats
  drawn from the community wrapped session (total hours, user count, top show/movie, episode-
  to-movie ratio, etc.). Facts cross-fade every 3 seconds. Falls back gracefully to generic
  messages if community stats are not yet available.
- **Loading hint on intro card**: While server stats are still fetching, the intro card's
  "Tap to begin" hint now reads "Loading your stats…" so users understand why they cannot
  advance past the first card yet.

## [2.4.0] - 2026-04-07

### Fixed
- **Improvements for small screens**: Headers on certain cards could be cut off on screens with a small resolution size, fixed the start position of headers below the progress dots and added ability to scroll

## [2.3.0] - 2026-03-31
- **Optional Tracearr integration**: Optionally use Tracearr history instead of Playback Reporting

## [2.2.0] - 2026-03-24
- **Live TV stats**: Added new card for LiveTV showing total watch time (for user) and the top 5 channels played by watch time

## [2.1.0] - 2026-03-16
- **Optional Seerr integration**: [Seerr](https://seerr.dev/) integration via optional `SEERR_URL` and `SEERR_API_KEY` environment variables. A requests card will be visible if there are requests during the selected time frame with total number of requests and breakdown of requests by Movie, Series, and User

## [2.0.2] - 2026-03-14
- **Share button fixes**: Fixed rendering issues on share button images

## [2.0.1] - 2026-03-12
- **Login rate limiting**: Added rate limiting for failed logins to mitigate brute force attempts

## [2.0.0] - 2026-03-10
- **Login page**: Added a login page with Emby Authentication. Users can log in with their usernames or email addresses and Emby password.

## [1.2.0] - 2026-03-08

### Added
- **URL Parameter Routing**: Added support for prefilled wrapped links using `?YYYY` and `?MM-YYYY` formats.
- **Community-Friendly URL Flow**: Added redirect handling for legacy shorthand URLs so existing links continue to work with the newer route flow.
- **Viewing Streaks Card**: Added timezone-aware current/longest streak analytics from de-duplicated playback dates and surfaced them in a dedicated wrapped card.
- **Series Completion Insights**: Added per-series completion metrics (watched/total/%), filtered out tiny series (<5 episodes), and introduced a new completion card with top-ranked and nearly-finished sections.

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
