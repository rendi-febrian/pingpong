# PingPong 🏓 — URL Uptime Monitor

A simple, modern uptime monitoring dashboard. Add your endpoints, check their status, and view 24h uptime percentages.

**Built with:** Node.js, Express, SQLite, Vanilla JS

## Features

- Add/manage URLs to monitor
- One-click check or check all
- Status indicators (Online/Offline/Unknown)
- Response time tracking
- 24-hour uptime percentage
- Clean dark-themed dashboard

## Quick Start

```bash
npm install && npm start
```

Open http://localhost:4567

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/endpoints` | List all endpoints with status |
| POST | `/api/endpoints` | Add endpoint `{url, label?}` |
| DELETE | `/api/endpoints/:id` | Remove endpoint |
| POST | `/api/endpoints/:id/check` | Check one endpoint |
| POST | `/api/check-all` | Check all endpoints |
| GET | `/api/endpoints/:id/history` | Check history |
