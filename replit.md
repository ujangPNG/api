# Overview

This is a Spotify statistics web application that analyzes users' music listening data through the Spotify API. The application provides insights into top tracks, artists, and listening patterns with multi-language support (Indonesian/English) and features a global leaderboard system for comparing music taste statistics across users.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Static Web Application**: Pure HTML/CSS/JavaScript frontend with no build process required
- **Single Page Application**: Main interface in `spotify/index.html` with dynamic content updates
- **Multi-language Support**: Client-side internationalization using `translations.js` for Indonesian and English
- **Responsive Design**: Mobile-first CSS design with gradient animations and modern UI components

## Authentication & API Integration
- **Spotify OAuth Flow**: Implements authorization code flow requiring users to set up their own Spotify Developer app
- **Client-side Token Management**: Access tokens stored and managed in browser session
- **API Proxy Pattern**: Vercel serverless functions act as intermediary for external API calls

## Data Processing
- **Real-time Analytics**: Fetches user's top tracks and artists with configurable time ranges (4 weeks, 6 months, several years)
- **Statistical Calculations**: Computes popularity averages, track counts, and other metrics client-side
- **Data Aggregation**: Combines multiple Spotify API endpoints to create comprehensive user profiles

## Backend Architecture
- **Serverless Functions**: Vercel-hosted API endpoints in `/api` directory
- **External Data Storage**: JSONBin.io used as cloud database for leaderboard persistence
- **CORS Configuration**: Proper cross-origin headers configured for API access

## Monetization Integration
- **Google AdSense**: Integrated advertising with multiple ad placements
- **Google Analytics**: User tracking and behavior analytics
- **Revenue Optimization**: Additional ad network integration for enhanced monetization

# External Dependencies

## Core Services
- **Spotify Web API**: Primary data source for user music statistics and authentication
- **JSONBin.io**: Cloud storage service for leaderboard data persistence
- **Vercel**: Hosting platform and serverless function runtime

## Analytics & Advertising
- **Google Analytics**: User behavior tracking and site analytics
- **Google AdSense**: Primary advertising network
- **RevenueCPMGate**: Secondary advertising network for additional revenue streams

## Development Tools
- **Vercel CLI**: Development and deployment tooling
- **Google Gemini API**: Experimental AI integration (separate testing module)

## Authentication Requirements
- Users must create Spotify Developer applications with specific redirect URI configuration
- Client ID management handled client-side for simplified deployment
- No server-side credential storage required