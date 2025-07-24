# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PocketN8N is a desktop application built with Tauri (Rust backend) and React (TypeScript frontend) that provides a user-friendly interface for managing N8N automation workflows via Docker. The app handles Docker container lifecycle management, status monitoring, and log viewing for a complete N8N stack including PostgreSQL, Redis, and N8N services.

## Development Commands

### Frontend Development
- `bun run dev` - Start Vite development server (port 5173)
- `bun run build` - Build frontend for production
- `bun run preview` - Preview production build

### Tauri Development  
- `bun run tauri:dev` - Start Tauri app in development mode (includes frontend hot reload)
- `bun run tauri:build` - Build Tauri app for production/distribution

### Docker Management
- `docker-compose up -d` - Start N8N stack (called via Rust backend)
- `docker-compose down` - Stop N8N stack (called via Rust backend)
- `docker-compose logs --tail=100` - View recent logs (called via Rust backend)

### Package Management
- `bun install` - Install dependencies

## Architecture Overview

### Frontend Architecture
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite with React plugin
- **Styling**: CSS modules (App.css, index.css)
- **State Management**: React useState/useEffect hooks
- **Tauri Integration**: Uses `@tauri-apps/api/core` for backend communication

### Backend Architecture (Rust/Tauri)
- **Main Entry**: `src-tauri/src/main.rs`
- **Shell Plugin**: `tauri-plugin-shell` for executing Docker commands
- **Commands Exposed**:
  - `check_docker_status` - Verify Docker installation and daemon status
  - `start_n8n` - Execute `docker-compose up -d`
  - `stop_n8n` - Execute `docker-compose down`
  - `get_n8n_logs` - Execute `docker-compose logs --tail=100`

### Docker Stack Configuration
The `docker-compose.yaml` defines a production-ready N8N environment:
- **postgres**: PostgreSQL 16 database with health checks
- **redis**: Redis 7 for queue management with authentication
- **n8n_editor**: Main N8N interface (port 5678)
- **n8n_webhook**: Dedicated webhook processor
- **n8n_worker**: Background job processor with concurrency=5

### Security Configuration
Tauri capabilities in `src-tauri/capabilities/default.json` restrict shell access to specific Docker commands:
- `docker --version` and `docker ps` for status checking
- `docker-compose` with `up`, `down`, `logs` subcommands only

## Key Implementation Details

### Frontend-Backend Communication
- All Docker operations are performed through Tauri's `invoke()` function
- Backend commands return `Result<T, String>` types for error handling
- Frontend uses TypeScript interfaces matching Rust structs (e.g., `DockerStatus`)

### N8N Configuration
- Default port: 5678 (configurable via N8N_PORT env var)
- Queue-based execution mode with Redis backing
- PostgreSQL for persistent data storage
- Automatic data pruning (168 hours max age, 1000 execution limit)
- Shared volume for N8N data persistence across container restarts

### Error Handling Patterns
- Rust backend: Commands return `Result<String, String>` with descriptive error messages
- Frontend: Try-catch blocks with console logging for debugging
- Docker status validation before allowing N8N operations

## Development Notes

### File Structure Importance
- `src-tauri/tauri.conf.json`: Main Tauri configuration, window settings, build commands
- `src-tauri/capabilities/default.json`: Security permissions for shell operations
- `docker-compose.yaml`: Complete N8N infrastructure definition
- `src/App.tsx`: Single-page application with all UI logic

### Environment Variables
The Docker stack supports customization via environment variables:
- `N8N_PORT`, `N8N_HOST`, `N8N_PROTOCOL` for URL configuration
- Database credentials: `DB_POSTGRESDB_*`
- Redis authentication: `QUEUE_BULL_REDIS_PASSWORD`
- Execution limits: `EXECUTIONS_DATA_MAX_AGE`, `EXECUTIONS_DATA_PRUNE_MAX_COUNT`

### Build Process
1. `bun run build` creates frontend dist
2. Tauri copies dist to app bundle
3. Rust compilation creates native binary
4. Final bundle includes both frontend and backend

The app requires Docker Desktop to be installed and running on the host system to function properly.