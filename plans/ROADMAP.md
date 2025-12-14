# Ollisten Development Roadmap

**Generated:** 2025-12-10
**Status:** Draft

This roadmap outlines improvements, bug fixes, and new features for Ollisten based on comprehensive codebase analysis.

---

## Phase 1: Critical Stability & Safety (Weeks 1-2)

### 1.1 Error Handling Hardening

**Priority: CRITICAL**

- [ ] **Fix unsafe JSON parsing**
  - `src/system/prompter.ts:224` - Wrap `JSON.parse(answer)` in try-catch with fallback
  - `src/system/agentManager.ts:210` - Validate JSON before parse in agent window loading
  - Add schema validation for LLM structured output responses

- [ ] **Replace Rust unwrap() calls**
  - `src-tauri/src/transcription/cpal_macos_hack.rs:23` - Handle `default_input_config()` failure
  - `src-tauri/src/transcription/voice_audio_detector_ext_v2.rs:81,145` - Add bounds checking
  - `src-tauri/src/main.rs:97,128` - Graceful degradation for window/app initialization failures

- [ ] **Agent config validation**
  - Define JSON schema for agent YAML structure
  - Validate on load with helpful error messages
  - Reject invalid configs before attempting to use them

- [ ] **LLM response validation**
  - Validate structured output conforms to provided schema
  - Handle malformed responses gracefully
  - Provide fallback behavior for schema mismatches

**Acceptance Criteria:**
- No `unwrap()` calls in hot paths that could cause crashes
- All JSON operations protected with try-catch
- User-facing errors provide actionable guidance
- Application never panics under normal failure conditions

---

### 1.2 Type Safety Improvements

**Priority: HIGH**

- [ ] **Remove `any` types from event system**
  - `src/system/events.ts` - Use generic type constraints properly
  - Define strict event type union for all event types
  - Make `subscribe()` and `emit()` type-safe

- [ ] **Fix TypeScript issues**
  - Remove `@ts-ignore` from `src/util/useAlerts.tsx:61`
  - Replace `any` in `src/AppDebug.tsx`, `src/Select.tsx`, `src/Menu.tsx`
  - Add proper types to event handlers

- [ ] **Rust type safety**
  - Review unsafe code blocks in `audio/macos_core_audio.rs`
  - Document safety invariants for unsafe operations
  - Consider safer FFI wrapper patterns

**Acceptance Criteria:**
- TypeScript strict mode enabled with zero errors
- No usage of `any` type except in explicitly typed external APIs
- All event subscriptions type-checked at compile time

---

### 1.3 Security Hardening

**Priority: HIGH**

- [ ] **Input validation**
  - Validate agent config file paths (prevent directory traversal)
  - Sanitize device IDs before use
  - Validate Ollama model names before spawning processes

- [ ] **Command execution safety**
  - `src-tauri/src/llm/ollama.rs` - Verify ollama binary path
  - `src-tauri/src/audio/driver.rs` - Validate installer package integrity
  - Use absolute paths for system commands

- [ ] **File operation safety**
  - Restrict agent config writes to app data directory
  - Validate YAML content before parsing
  - Add file size limits to prevent DoS

**Acceptance Criteria:**
- All file paths validated against whitelist
- Command execution uses verified absolute paths
- Agent configs sandboxed to app directory

---

## Phase 2: Testing & Quality (Weeks 3-4)

### 2.1 Test Infrastructure

**Priority: HIGH**

- [ ] **Setup Rust testing**
  - Add `cargo test` infrastructure
  - Unit tests for config parsing (`config/agents.rs`)
  - Unit tests for LLM routing logic
  - Mock tests for Tauri commands

- [ ] **Setup TypeScript testing**
  - Add Vitest configuration
  - Unit tests for event system
  - Unit tests for agent manager
  - React component tests with React Testing Library

- [ ] **Integration tests**
  - Test agent lifecycle (create → start → stop → delete)
  - Test transcription start/stop flow
  - Test LLM communication with mock responses
  - Test config file hot-reload

**Test Coverage Goals:**
- Core business logic: 80%+
- Event system: 90%+
- Config parsing: 95%+
- UI components: 60%+

---

### 2.2 Error Recovery Testing

**Priority: MEDIUM**

- [ ] **Failure scenarios**
  - Ollama offline/crashes mid-session
  - Invalid agent YAML files
  - Audio device disconnection during transcription
  - Malformed LLM responses
  - Disk full during config save

- [ ] **Resource cleanup validation**
  - Memory leak tests for long-running sessions
  - Window lifecycle cleanup verification
  - Transcription session cleanup on abort

**Acceptance Criteria:**
- Application recovers from all tested failure modes
- No resource leaks after 100 start/stop cycles
- Clear error messages guide user recovery

---

## Phase 3: Code Quality & Refactoring (Weeks 5-6)

### 3.1 Remove Technical Debt

**Priority: MEDIUM**

- [ ] **Remove deprecated code**
  - Delete `src-tauri/src/llm/llama_cpp.rs` (unused)
  - Delete `src-tauri/src/llm/open_ai.rs` (unused)
  - Delete `src-tauri/src/transcription/model_old.rs`
  - Remove deprecated functions in `cpal_macos_hack.rs`

- [ ] **Resolve TODOs**
  - Fix type issue in `src/system/prompter.ts:96`
  - Document decision on llama_cpp/openai integration
  - Either implement or remove placeholder LLM providers

**Acceptance Criteria:**
- Zero commented-out code blocks >50 lines
- All TODO comments have tracking issues or are resolved
- Dead code eliminated from build

---

### 3.2 Refactoring

**Priority: MEDIUM**

- [ ] **Split large functions**
  - `src-tauri/src/transcription/control.rs:start_transcription()` - Extract device setup, model loading, event handling
  - `src-tauri/src/audio/macos_core_audio.rs` - Extract helper functions for FFI operations
  - `src/system/transcription.ts` - Split into separate modules (session management, event handling, state)

- [ ] **Extract configuration constants**
  - Voice detection thresholds (0.6, 0.3)
  - Time windows (250ms, 100ms, 10000ms)
  - Retry timeouts (20 seconds)
  - Debounce delays (500ms)
  - Make configurable or document rationale

- [ ] **Consolidate error patterns**
  - Standardize error logging (choose `info!` vs `error!`)
  - Create error helper functions for common patterns
  - Consistent error event emission

**Acceptance Criteria:**
- No function >150 lines
- Magic numbers replaced with named constants
- Consistent error handling patterns across codebase

---

### 3.3 Performance Optimization

**Priority: LOW**

- [ ] **Rendering optimization**
  - Add `useMemo` for derived state in `useModes.ts`
  - Memoize agent callbacks to prevent re-renders
  - Use `Map` instead of `findIndex()` in transcription.ts

- [ ] **Event system optimization**
  - Replace linear scan with Map lookup for event types
  - Batch event emissions where possible
  - Profile event processing overhead

- [ ] **Resource optimization**
  - Lazy load transcription model (don't preload)
  - Cache Ollama model list
  - Debounce file watcher events

**Acceptance Criteria:**
- UI re-renders reduced by 50%
- Event emission latency <5ms for 90th percentile
- Memory usage stable during 1-hour session

---

## Phase 4: Documentation (Week 7)

### 4.1 Code Documentation

**Priority: MEDIUM**

- [ ] **Add JSDoc comments**
  - All public TypeScript functions
  - Complex algorithms (VAD, event loop)
  - Agent manager public API

- [ ] **Add Rust doc comments**
  - All public Tauri commands
  - Module-level documentation
  - Safety invariants for unsafe code

- [ ] **Document configuration formats**
  - Agent YAML schema with examples
  - Structured output JSON schema format
  - App config JSON structure

**Acceptance Criteria:**
- 100% of public APIs documented
- Examples provided for all configuration formats
- Safety invariants documented for unsafe code

---

### 4.2 User Documentation

**Priority: MEDIUM**

- [ ] **Agent creation guide**
  - Step-by-step agent YAML authoring
  - Structured output examples
  - Handlebars template reference

- [ ] **Troubleshooting guide**
  - Common errors and fixes
  - Ollama connection issues
  - Audio driver installation problems
  - Transcription model download failures

- [ ] **Architecture documentation**
  - Expand CLAUDE.md with sequence diagrams
  - Document event flow
  - Explain transcription pipeline in detail

**Acceptance Criteria:**
- User can create agent without code inspection
- Common errors documented with solutions
- Architecture diagrams added to CLAUDE.md

---

## Phase 5: New Features (Weeks 8+)

### 5.1 Quality of Life Improvements

**Priority: MEDIUM**

- [ ] **Better error visibility**
  - Persistent error log window
  - Error history with timestamps
  - Export error logs for debugging

- [ ] **Configuration UI**
  - In-app editor for voice detection thresholds
  - Configurable timeouts and retry logic
  - Model download cache location selector

- [ ] **Status indicators**
  - Better progress UI for model downloads
  - Transcription status in tray icon
  - Agent activity indicators

**Acceptance Criteria:**
- Users can configure advanced settings without editing files
- Error history accessible from UI
- Real-time status visible at all times

---

### 5.2 Advanced Features

**Priority: LOW**

- [ ] **Agent execution history**
  - Save agent outputs to local database
  - Search past agent responses
  - Export conversation logs

- [ ] **LLM response caching**
  - Cache identical prompts to reduce latency
  - Configurable cache TTL
  - Cache size limits

- [ ] **Multi-LLM support**
  - Finish OpenAI integration
  - Add support for local llama.cpp
  - Per-agent LLM provider selection

- [ ] **Batch operations**
  - Import/export agent configs as bundle
  - Duplicate agent with modifications
  - Bulk enable/disable agents

**Acceptance Criteria:**
- Agent history searchable and exportable
- Cache reduces LLM calls by 30%+
- Users can choose LLM provider per agent

---

### 5.3 Cross-Platform Support

**Priority: LOW**

- [ ] **Windows support**
  - Virtual audio device equivalent for Windows
  - Test on Windows 10/11
  - Windows-specific installer

- [ ] **Linux support**
  - PulseAudio/PipeWire integration
  - Linux audio device enumeration
  - AppImage or deb package

**Acceptance Criteria:**
- All features work on Windows
- All features work on Linux
- Platform-specific code isolated to modules

---

## Milestone Summary

| Phase | Duration | Focus | Key Outcomes |
|-------|----------|-------|--------------|
| 1 | Weeks 1-2 | Stability & Safety | Zero critical bugs, type-safe, secure |
| 2 | Weeks 3-4 | Testing | 80%+ test coverage, validated recovery |
| 3 | Weeks 5-6 | Quality | Clean codebase, optimized performance |
| 4 | Week 7 | Documentation | Comprehensive docs for users & devs |
| 5 | Weeks 8+ | Features | Enhanced UX, advanced capabilities |

---

## Success Metrics

**Phase 1-2 (Critical Path):**
- Zero application crashes in normal use
- 100% of user inputs validated
- 80%+ test coverage on core logic

**Phase 3-4 (Quality):**
- Code review approval on all refactorings
- Documentation coverage 100% of public APIs
- Performance benchmarks meet targets

**Phase 5 (Growth):**
- User-requested features prioritized
- Cross-platform parity achieved
- Feature adoption measured

---

## Notes

- Phases can overlap; testing should start in Phase 1
- User feedback may reprioritize Phase 5 features
- Security fixes take precedence over roadmap
- Performance work should be validated with profiling

---

## Issue Tracking

Create GitHub issues for each checklist item with labels:
- `priority:critical` - Phase 1 items
- `priority:high` - Phase 2 items
- `priority:medium` - Phase 3-4 items
- `priority:low` - Phase 5 items
- `type:bug`, `type:refactor`, `type:feature`, `type:docs`
