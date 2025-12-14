# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ollisten is an AI Meeting Assistant built with Tauri 2, allowing users to create and customize their own agents for real-time transcription and AI-powered meeting assistance.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite + Material-UI + Tailwind CSS
- **Backend:** Rust + Tauri 2
- **AI/ML:** Kalosm (for local transcription using Whisper), Ollama (for LLM inference)
- **Audio:** Custom macOS Core Audio integration with virtual audio driver

## Development Commands

### Running the Application
```bash
# Development mode with environment variables
./run-dev.sh
# Or manually:
MACOSX_DEPLOYMENT_TARGET=10.15 RUST_BACKTRACE=1 pnpm tauri dev

# Build TypeScript and run Tauri build
pnpm build

# Build DMG bundle for distribution
pnpm bundle
```

### Frontend Development
```bash
# Development server (Vite only, without Tauri)
pnpm dev

# TypeScript compilation
tsc

# Preview production build
pnpm preview
```

### Backend Development
```bash
# Navigate to Rust workspace
cd src-tauri

# Build Rust backend
cargo build

# Run Rust tests
cargo test

# Format Rust code
cargo fmt
```

## Architecture Overview

### Tauri Multi-Window System

The application uses a multi-window architecture with four distinct entry points (defined in `vite.config.ts`):

1. **Main Window** (`index.html` → `main.tsx` → `App.tsx`): Primary UI with tabs for Launch, Mode, Agent, Engine, and Audio configuration
2. **Agent Window** (`agent.html` → `main-agent.tsx` → `AppAgent.tsx`): Floating window displaying real-time agent output
3. **Agent Edit Window** (`agent-edit.html` → `main-agent-edit.tsx` → `AppAgentEdit.tsx`): Editor for creating/modifying agents
4. **Debug Window** (`debug.html` → `main-debug.tsx` → `AppDebug.tsx`): Development/debugging interface

Windows are managed through Tauri's WebviewWindow API. The main window stays in the system tray on macOS when closed (see `main.rs:155-172`).

### Agent System

**Agents** are user-configurable AI assistants defined in YAML files stored in the user's config directory (`~/Library/Application Support/ollisten/agent/` on macOS).

**Agent Structure** (see `src-tauri/src/config/agents.rs:17-22`):
```yaml
intervalInSec: 30  # How often to query the LLM
transcriptionHistoryMaxChars: 5000  # Max chars of transcription to send
prompt: "Your custom prompt here"
structuredOutput:  # Optional: force structured JSON output
  schema: '{"type": "object", ...}'  # JSON Schema
  mapper: '{{field1}} - {{field2}}'  # Mustache template for display
```

**Modes** are collections of agents that launch together. Defined in app config (`~/Library/Application Support/ollisten/appConfig.json`) with structure:
```json
{
  "modes": {
    "uuid-here": {
      "label": "Meeting Notes",
      "agents": ["summarizer", "action-items"]
    }
  }
}
```

Agent files are hot-reloaded via the file watcher (`src-tauri/src/config/watcher.rs`), which emits events to the frontend on create/modify/delete.

### Transcription Pipeline

**Flow:** Audio Device → Kalosm Whisper Model → Voice Activity Detection → Frontend Events

Key files:
- `src-tauri/src/transcription/control.rs`: Main transcription session management
- `src-tauri/src/transcription/voice_audio_detector_ext_v2.rs`: Voice activity detection (VAD) to chunk audio
- `src-tauri/src/audio/devices.rs`: Lists available audio input devices
- `src-tauri/src/audio/driver.rs`: Manages virtual audio driver installation (macOS)
- `src-tauri/src/audio/macos_core_audio.rs`: macOS-specific Core Audio integration

The transcription system uses a custom CPAL fork (`cpal_macos_hack.rs`) to create hidden audio devices for system audio capture.

### LLM Integration

**Routing** (see `src-tauri/src/llm/router.rs`):
- Currently supports **Ollama** (local LLM server)
- Future-ready for OpenAI and LLaMA.cpp (see `llm/open_ai.rs`, `llm/llama_cpp.rs`)
- Structured output via JSON schema enforced through Ollama's format parameter

The frontend invokes `llm_talk` which routes to the configured LLM provider. Ollama is auto-started if installed but not running (`llm/ollama.rs:34-86`).

### State Management

**Tauri State** (managed via `.manage()` in `main.rs:63-71`):
- `TranscriptionState`: Holds active Whisper model and device listeners
- `WatcherState`: File system watcher for agent config hot-reload
- `LlmRouterState`: Current LLM configuration (Ollama model name)

**Frontend State:**
- React hooks (`useState`, `useEffect`) for UI state
- Custom hooks: `useAgents.ts`, `useModes.ts`, `useAppConfig.ts`
- Event-driven updates via `Events.get().subscribe()` pattern (see `src/system/events.ts`)

### Configuration & Persistence

All user data stored in platform-specific app directories via `dirs::data_local_dir()`:
- **Agent configs:** `{data_dir}/ollisten/agent/*.yaml`
- **App config:** `{data_dir}/ollisten/appConfig.json` (contains modes, selected devices, models)

Config is read/written through Tauri commands (`config/agents.rs`, `config/app_config.rs`).

## Common Development Patterns

### Adding a New Tauri Command

1. Define the command in the appropriate Rust module (e.g., `src-tauri/src/config/agents.rs`)
2. Add `#[tauri::command]` attribute
3. Register in `main.rs` invoke handler (~line 78)
4. Call from frontend via `invoke('command_name', { args })`

### Creating a New Agent Window

See `src/agentEditWindow.ts` for the pattern:
1. Create new HTML entry in `vite.config.ts`
2. Create corresponding React entry point
3. Use `WebviewWindow` API to spawn/manage window
4. Track window state in `AgentManager` singleton

### Emitting Backend Events to Frontend

```rust
// In Tauri command
app_handle.emit("event-name", payload)?;
```

```typescript
// In frontend
Events.get().subscribe(['event-name'], (data) => { ... });
```

## Platform-Specific Notes

### macOS
- Requires `MACOSX_DEPLOYMENT_TARGET=10.15` for audio driver compatibility
- Uses private macOS APIs via `tauri` feature flag `macos-private-api` (see `Cargo.toml:12`)
- System tray icon changes based on dark/light mode (see `main.rs:187-242`)
- App stays in dock/tray when main window closes (controlled by `should_exit` flag)
- Custom virtual audio driver for system audio capture must be installed via `audio/driver.rs`

### Custom Dependencies
- **ollama-rs fork:** Supports dynamic schema for structured output (branch `matus/dynamic-schema`)
- **kalosm fork:** Adds hidden device creation for macOS (branch `matus/create-hidden-device`)
- **cpal patch:** Custom audio device handling (branch `matus/create-hidden-device`)

## File Organization

```
src/                    # Frontend React/TypeScript
  ├── main.tsx         # Main window entry
  ├── App.tsx          # Main window UI
  ├── system/          # Core system integrations
  │   ├── agentManager.ts    # Agent lifecycle management
  │   ├── transcription.ts   # Transcription session control
  │   ├── llm.ts            # LLM invocation
  │   └── events.ts         # Event bus
  └── util/            # Shared utilities

src-tauri/src/          # Backend Rust
  ├── main.rs          # App entry, window/tray setup
  ├── audio/           # Audio device & driver management
  ├── config/          # Agent & app config I/O
  ├── llm/             # LLM provider integrations
  ├── transcription/   # Whisper model & audio processing
  └── util/            # Error handling, paths

plans/                  # Project planning documents
  ├── ROADMAP.md       # Development roadmap with phases and priorities
  └── ANALYSIS.md      # Codebase analysis and technical debt assessment
```

## Planning & Documentation

**All planning documents, technical proposals, and roadmaps should be placed in the `plans/` directory.**

This includes:
- Feature proposals and design documents
- Roadmaps and project milestones
- Technical debt analysis
- Architecture decision records (ADRs)
- Investigation notes and findings

The `plans/` folder helps maintain a historical record of project direction and technical decisions.

## Key Invariants

- **Agent names must be unique** (enforced by filename in `agent/` directory)
- **Transcription stops when all agent windows close** (see `useModes.ts:100-106`)
- **Ollama must be running** before LLM features work (auto-start attempted)
- **Virtual audio driver** required for system audio on macOS (not microphone)
- **Config watcher** only starts after first `get_all_agent_configs` call (lazy init)
