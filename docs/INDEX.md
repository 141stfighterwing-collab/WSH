# WSH v3.3.0 — Documentation

Welcome to the WSH (WeaveNote Self-Hosted) documentation. This directory contains detailed guides for installation, configuration, and usage.

## Guides

| Document | Description |
|----------|-------------|
| [CHANGELOG.md](../CHANGELOG.md) | Complete version history and change log |
| [worklog.md](../worklog.md) | Development task log and work history |

## Quick Links

- **Installation**: See [README.md](../README.md#quick-start) for quick start guide
- **Docker**: See [README.md](../README.md#docker-deployment) for Docker deployment
- **PowerShell**: See [README.md](../README.md#powershell-installer) for Windows installer
- **API Routes**: See [README.md](../README.md#api-routes) for all API endpoints
- **Environment Variables**: See [README.md](../README.md#environment-variables) for configuration

## Architecture

WSH is built with a 3-column responsive layout:

```
┌─────────────────────────────────────────────────────────────────┐
│                         Header (sticky)                         │
├──────────┬───────────────────────────────┬─────────────────────┤
│          │                               │    Live Clock       │
│ Calendar │                               │  Today's Things     │
│ Quick    │        Main Content            │    Projects         │
│ Refs     │   ┌─────────────────────┐     │                     │
│          │   │   Note Editor       │     │                     │
│ Folders  │   │   (type tabs)       │     │                     │
│          │   ├─────────────────────┤     │                     │
│ Tags     │   │   Notes Grid        │     │                     │
│ (neon)   │   │   (cards)           │     │                     │
│          │   └─────────────────────┘     │                     │
├──────────┴───────────────────────────────┴─────────────────────┤
│                         Footer                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Key Components

### Left Sidebar
- **Calendar**: Compact mini-calendar with month navigation
- **Quick References**: Expandable note templates (Daily Standup, Meeting Notes, etc.)
- **Folders**: Hierarchical folder organization with note counts
- **Tags**: Popular tags with neon glow effects — **clickable to filter notes**

### Right Sidebar
- **Live Clock**: Real-time clock with full date display (HH:MM:SS)
- **Today's Things**: Notes matching today (by date, content, or hashtags like `#today`, `#monday`)
- **Projects**: All project-type notes listed with tags and last-updated date

### Main Content
- **Note Editor**: Rich text editor with 6 note types, formatting toolbar, tag input, AI synthesis
- **Notes Grid**: 2-column card grid with folder/tag filtering, search, context menus

### Modals & Panels
- **Mind Map**: SVG force-directed graph visualization
- **Trash Modal**: Soft-delete with restore/permanent delete
- **Notebook View**: Linear document reader
- **Note Detail Modal**: Full note metadata viewer
- **Admin Panel**: System administration (ENV, Users, Logs, DB Viewer)
- **Settings Panel**: Theme, dark mode, preferences
- **Analytics Panel**: Note statistics dashboard
- **DB Viewer**: Full-screen database browser
