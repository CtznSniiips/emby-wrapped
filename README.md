# <img width="24px" src="./src/lib/assets/embywrapped-logo.png" alt="EmbyWrapped"></img> Emby Wrapped (Enhanced)

A beautiful, Spotify Wrapped-style year-in-review experience for your Emby media server. This fork includes enhanced music statistics, improved image handling, and more detailed viewing patterns.

![Emby Wrapped](https://img.shields.io/badge/Emby-Wrapped-1db954?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![SvelteKit](https://img.shields.io/badge/SvelteKit-FF3E00?style=for-the-badge&logo=svelte&logoColor=white)

## Fork Improvements

This version (`emby-wrapped`) adds several features and improvements over the original:

- **Enhanced Music Statistics** - Detailed breakdown of top artists and tracks with full image support.
- **Image Proxy & Caching** - Built-in image proxy to solve CORS issues and provide persistent caching for faster loading.
- **Flexible Time Ranges** - Support for both yearly and monthly "Wrapped" views.
- **Library Filtering** - Use `FILTER_USER_ID` to restrict displayed content (e.g., to hide NSFW libraries).
- **High-Quality Visuals** - Automatically fetches higher resolution posters and artist images.
- **Improved Error Handling** - Robust handling of missing images and server connection issues.
- **URL parameters** - Provide URLs with a pre-selected time-frame
- **Emby authentication** - Added security via Emby authentication. Users must log in to see stats
- **Seerr integration** - Optional Seerr integration showing number of requests and broken down by movie, series, and user

## Screenshots

<p align="center">
  <img src="https://images.disinfo.zone/uploads/cUxT3h3VqZUrNWHnFaJl2S7MVNkFDZA11ZndwHET.jpg" width="250" alt="Top Shows" />
  <img src="https://images.disinfo.zone/uploads/SNPzSbEtNqFrd4CmQSBvbtUhe9QFP4Hjuz8kYD8s.jpg" width="250" alt="Viewing Stats" />
  <img src="https://images.disinfo.zone/uploads/FI4PJKqYrcASPtrKS64KO4QC87jcu47KjT4BkFK6.jpg" width="250" alt="Genre Breakdown" />
</p>

## Features

- **Total Watch Time** - See how many days/hours you've spent watching
- **Top Shows and Movies** - Your most-watched content with beautiful poster displays
- **Genre Breakdown** - Discover your viewing preferences
- **Viewing Patterns** - Peak hours and favorite days of the week
- **Viewing Personality** - Fun personality type based on your habits
- **Binge Sessions** - See your longest viewing marathons
- **Monthly Journey** - Track your viewing across the year
- **Device breakdown** - See which devices you watched on
- **Live TV** - See Live TV time watched and top 5 channels
- **Share Cards** - Download individual stat cards to share

## Requirements

### Emby Server Setup

1. **Emby Server** - Version 4.7+ recommended
2. **Playback Reporting Plugin** (Required unless using Tracearr)
   - Go to Emby Dashboard → Plugins → Catalog
   - Search for "Playback Reporting"
   - Install and restart Emby server
   - This plugin tracks detailed playback history needed for stats
   - If you use Tracearr integration (`TRACEARR_URL` + `TRACEARR_API_KEY`), Emby Wrapped can read playback history from Tracearr instead
   - If Tracearr usernames differ from current Emby usernames, use `TRACEARR_USERNAME_ALIASES` to map old names to current names

3. **API Key**
   - Go to Emby Dashboard → API Keys
   - Create a new API key for "Emby Wrapped"
   - Copy the key for configuration

## Quick Start with Docker (Recommended)

### Option 1: Using Pre-built Image from GHCR (Easiest)

Pull the image from GitHub Container Registry and run:

1. Create a directory for your setup:
```bash
mkdir emby-wrapped && cd emby-wrapped
```

2. Create a `docker-compose.yml` file:
```yaml
version: '3.8'
services:
  emby-wrapped:
    image: ghcr.io/ctznsniiips/emby-wrapped:latest
    container_name: emby-wrapped
    ports:
      - "3000:3000"
    environment:
      - EMBY_URL=http://your-emby-server:8096
      - EMBY_API_KEY=your-api-key-here
      - TMDB_API_KEY=    # Optional: for enhanced poster images
      - SEERR_URL=       # Optional: Overseerr/Jellyseerr URL for request stats
      - SEERR_API_KEY=   # Optional: Overseerr/Jellyseerr API key
      - TRACEARR_URL=    # Optional: Tracearr URL (uses Tracearr history instead of Playback Reporting)
      - TRACEARR_API_KEY=# Optional: Tracearr public API key (format: trr_pub_*)
      - TRACEARR_USERNAME_ALIASES= # Optional: oldname1:newname1,oldname2:newname2
      - PUBLIC_URL=      # Optional: for share links
      - CACHE_TTL=86400  # Optional
      - FILTER_USER_ID=  # Optional: filter by user's library
    volumes:
      - ./music:/app/static/music:ro  # Optional: custom background music
    restart: unless-stopped
```

3. Run:
```bash
docker compose up -d
```

4. Access at `http://localhost:3000`

### Updating

**Pre-built image:**
```bash
docker-compose pull && docker-compose up -d
```

## Local Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

1. Clone the repository:
```bash
git clone https://github.com/ctznsniiips/emby-wrapped.git
cd emby-wrapped
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` with your Emby server details:
```env
EMBY_URL=http://your-emby-server:8096
EMBY_API_KEY=your-api-key-here
```

5. Start development server:
```bash
npm run dev
```

6. Open `http://localhost:5173` in your browser

### Building for Production

```bash
npm run build
npm run preview
```

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `EMBY_URL` | Full URL to your Emby server (e.g., `http://192.168.1.100:8096`) | Yes |
| `EMBY_API_KEY` | API key from Emby Dashboard | Yes |
| `TMDB_API_KEY` | TMDB API key for enhanced poster images (get one free at themoviedb.org) | No |
| `SEERR_URL` | Seerr/Overseerr/Jellyseerr base URL for request stats (e.g., `http://192.168.1.100:5055`) | No |
| `SEERR_API_KEY` | Seerr/Overseerr/Jellyseerr API key used to fetch requests (used with `SEERR_URL`) | No |
| `TRACEARR_URL` | Tracearr base URL (e.g., `http://192.168.1.100:3001`). When set with `TRACEARR_API_KEY`, history data is pulled from Tracearr instead of Emby's Playback Reporting plugin. | No |
| `TRACEARR_API_KEY` | Tracearr Public API key (`trr_pub_*`) used with `TRACEARR_URL`. | No |
| `TRACEARR_USERNAME_ALIASES` | Optional case-insensitive username mapping for Tracearr-to-Emby matching after renames. Format: `oldname1:newname1,oldname2:newname2`. | No |
| `PUBLIC_URL` | Public URL for share links (defaults to request origin) | No |
| `ANALYTICS_SCRIPT` | Analytics script tag (e.g., Umami, Plausible) to inject into page head | No |
| `FILTER_USER_ID` | Emby User ID to use for library filtering (useful for hiding NSFW content) | No |
| `CACHE_TTL` | Cache duration in seconds for statistics (default: 86400) | No |

## Background Music

Emby Wrapped supports custom background music during the presentation. To add your own tracks:

1. Create a `static/music/` directory in the project
2. Add MP3 files to the directory
3. Music will automatically play during the wrapped experience

For Docker deployments, mount a volume to `/app/static/music/` (see docker-compose example).

## Usage

### General use
1. Navigate to the app in your browser
2. Log in using an Emby username and password for your Emby instance
3. Select the time period (Year or Month) you want to view
4. Enjoy your personalized Emby Wrapped experience!
5. Use the Share button on any card to download it as an image

### URL parameters
Provide time-specific URLs for your users

Add `?YYYY` or `?MM-YYYY` to your url to pre-select the time period where `MM` is the 2 digit month and `YYYY` is the 4 digit year

#### Example
> `http://yourip:3000?2025` - will pre-select the year 2025 review after the user logs in

## Tech Stack

- **Framework**: SvelteKit
- **Styling**: Tailwind CSS
- **Animations**: CSS animations + Svelte transitions
- **Image Capture**: html2canvas
- **Fonts**: Space Grotesk, JetBrains Mono

## Security Considerations

- API keys are stored server-side only and never exposed to the client
- All Emby API requests are proxied through the server
- No user data is stored - stats are fetched fresh each time
- CORS is handled server-side

## Troubleshooting

### "No users found"
- Verify your `EMBY_URL` is correct and accessible
- Check that your `EMBY_API_KEY` has sufficient permissions

### Stats seem incomplete
- Make sure the **Playback Reporting** plugin is installed
- The plugin needs time to collect data - it only tracks plays after installation
- Check the date range - Emby Wrapped shows current year stats

### Images not loading
- Ensure your Emby server is accessible from the Emby Wrapped container/server
- Check for any firewall rules blocking the connection

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Inspired by Spotify Wrapped
- Built for the Emby community
- Uses the Emby API for data retrieval
