# Codebase Analysis Report

**Date:** 2025-12-10
**Total Lines Analyzed:** ~7,000 (4,732 TypeScript + 2,349 Rust)

---

## Executive Summary

Ollisten is a **functional but immature** application with significant technical debt in error handling, testing, and type safety. The core transcription and agent systems work, but production readiness requires hardening around edge cases and failure scenarios.

**Key Strengths:**
- Innovative agent architecture with hot-reload
- Clean separation of frontend/backend via Tauri
- Custom audio pipeline with macOS Core Audio integration
- Real-time transcription with voice activity detection

**Critical Weaknesses:**
- **Zero test coverage** on any code path
- **Unsafe error handling** with unwrap() calls that can crash
- **Type safety gaps** with excessive `any` usage
- **No input validation** on user-provided configs
- **Deprecated/unused code** cluttering codebase

---

## 1. Error Handling Assessment

### Critical Issues (Will Cause Crashes)

| Location | Issue | Impact |
|----------|-------|--------|
| `src/system/prompter.ts:224` | `JSON.parse(answer)` without try-catch | Crash if LLM returns invalid JSON |
| `src-tauri/src/main.rs:97` | `unwrap()` on window creation | Crash on startup if window fails |
| `src-tauri/src/transcription/cpal_macos_hack.rs:23` | `unwrap()` on audio config | Crash if device unavailable |
| `src-tauri/src/transcription/voice_audio_detector_ext_v2.rs:81` | `unwrap()` on deque pop | Crash if voice probabilities empty |

### Error Handling Patterns

**Good:**
- `src/util/useAppConfig.ts:44` - JSON.parse wrapped in try-catch
- `src-tauri/src/util/error_handler.rs` - Centralized error display helper

**Bad:**
- Silent error suppression without logging
- `.expect()` with generic messages
- Error events emitted but not always handled

### Recommendations

1. **Replace all unwrap() in library code** with proper error propagation
2. **Validate all external inputs** before processing (JSON, YAML, device IDs)
3. **Add error boundaries** in React components
4. **Standardize error logging** (use `error!()` consistently)

---

## 2. Type Safety Analysis

### TypeScript Issues

**Any Type Usage (21 instances found):**

| File | Line | Issue |
|------|------|-------|
| `src/system/events.ts` | 21, 68 | Event listener types |
| `src/system/prompter.ts` | 97 | Event type array |
| `src/AppDebug.tsx` | Multiple | Debug transcript refs |
| `src/Select.tsx` | Multiple | Event handlers |
| `src/Menu.tsx` | Multiple | React children |

**@ts-ignore Suppressions:**
- `src/util/useAlerts.tsx:61` - Function export type issue

### Unsafe Rust Code

**Unsafe blocks requiring review:**
- `src-tauri/src/audio/macos_core_audio.rs` - 300+ lines of FFI without safety docs
- `src-tauri/src/transcription/cpal_macos_hack.rs` - Deprecated unsafe transmute

### Recommendations

1. **Enable TypeScript strict mode** and fix all errors
2. **Replace `any` with proper generics** in event system
3. **Document safety invariants** for all unsafe Rust code
4. **Add runtime type validation** for LLM responses using zod/serde

---

## 3. Security Assessment

### Vulnerabilities

**Input Validation (HIGH RISK):**
- Agent config paths constructed from user input without sanitization
- Device IDs accepted as integers without range validation
- Ollama command spawned without path verification

**File Operations (MEDIUM RISK):**
- No checks for path traversal in agent config saves
- YAML parsing without schema validation
- No file size limits on config reads

**Command Execution (LOW RISK):**
- `ollama` binary executed from PATH (could be hijacked)
- `.pkg` installer opened with system handler (relies on OS security)

### Recommendations

1. **Whitelist allowed config paths** to app data directory only
2. **Validate all YAML against schema** before parsing
3. **Use absolute paths for commands** and verify before execution
4. **Add input sanitization** for all user-provided data

---

## 4. Code Quality Metrics

### Complexity Analysis

**Functions >100 lines:**
- `src-tauri/src/transcription/control.rs:start_transcription()` - 170 lines
- `src-tauri/src/audio/macos_core_audio.rs` - 300+ line module
- `src/system/transcription.ts` - 400+ line class

**Cyclomatic Complexity (estimated):**
- `start_transcription()` - ~15 (needs splitting)
- `llm_talk_ollama()` - ~5 (acceptable)
- `AgentManager.managerStart()` - ~8 (acceptable)

### Code Duplication

**Duplicated patterns:**
- Error event emission (should be helper function)
- Device enumeration logic across input/output/hidden
- LLM initialization in router and ollama modules

### Technical Debt

**Deprecated code to remove:**
- `src-tauri/src/llm/llama_cpp.rs` - 151 lines (entirely unused)
- `src-tauri/src/llm/open_ai.rs` - 50 lines (entirely unused)
- `src-tauri/src/transcription/model_old.rs` - 38 lines
- Deprecated unsafe functions in `cpal_macos_hack.rs`

**TODO comments:**
- 3 TODO comments requiring action
- 2 modules held off pending decision

---

## 5. Performance Analysis

### Rendering Performance

**Issues identified:**
- `useModes.ts` creates new Set on every render
- No memoization of computed values
- `findIndex()` used instead of Map lookups

**Estimated impact:**
- ~10ms wasted per render cycle
- Unnecessary re-renders on agent updates

### Event System Performance

**Current implementation:**
- O(n) lookup for event listeners (linear scan)
- No event batching
- Synchronous emission blocks caller

**Recommendations:**
- Use Map<string, Set<Listener>> for O(1) lookup
- Batch events emitted in rapid succession
- Consider async event emission for long handlers

### Resource Usage

**Memory:**
- Transcription buffers grow unbounded in debug mode
- Event listeners not always cleaned up properly
- Agent windows may leak if close errors suppressed

**CPU:**
- Voice activity detection runs continuously
- No throttling on file watcher events

---

## 6. Testing Assessment

### Current State

**Test Coverage: 0%**
- No test files found
- No test infrastructure configured
- No CI/CD pipeline

### Critical Paths Requiring Tests

**High Priority:**
1. Agent config parsing and validation
2. Transcription session lifecycle
3. LLM communication with structured output
4. Event system subscribe/unsubscribe
5. Window lifecycle management

**Medium Priority:**
1. Audio device enumeration
2. Ollama auto-start logic
3. File watcher hot-reload
4. App config persistence
5. Mode start/stop logic

**Low Priority:**
1. UI component rendering
2. Utility functions (debounce, etc.)
3. Type conversions

### Recommended Test Strategy

1. **Unit tests** - Pure functions, parsers, validators
2. **Integration tests** - Agent lifecycle, transcription flow
3. **E2E tests** - Critical user journeys (create agent → run → view output)
4. **Property tests** - Config parsing, event system

---

## 7. Documentation Quality

### Current State

**Inline Documentation:**
- ❌ No JSDoc comments on public functions
- ❌ No Rust doc comments on modules
- ❌ No examples in code comments
- ✅ CLAUDE.md provides architecture overview

**User Documentation:**
- ✅ README.md exists but minimal
- ❌ No agent authoring guide
- ❌ No troubleshooting documentation
- ❌ No API reference

### Documentation Gaps

1. **Agent YAML format** - No schema documentation
2. **Structured output** - JSON schema format not explained
3. **Handlebars templates** - No template syntax guide
4. **Event flow** - No sequence diagrams
5. **Troubleshooting** - Common errors not documented

---

## 8. Dependency Analysis

### Custom Forks

**Risk assessment:**

| Dependency | Fork Reason | Risk Level |
|------------|-------------|------------|
| `ollama-rs` | Dynamic schema support | Medium - Needs upstreaming |
| `kalosm` | Hidden device creation | Medium - macOS specific |
| `cpal` | Hidden device patch | Medium - Core functionality |

**Recommendations:**
- Upstream patches to reduce maintenance burden
- Document why forks are necessary
- Pin to specific commits for reproducibility

### Dependency Health

**Outdated:**
- None identified (recent package.json/Cargo.toml)

**Security:**
- No known vulnerabilities in direct dependencies
- Should add `cargo audit` and `npm audit` to CI

---

## 9. Platform Support

### Current State

**Supported:**
- ✅ macOS (primary target)

**Partial Support:**
- ⚠️ Windows - Ollama start logic implemented but audio driver missing
- ❌ Linux - Returns "Platform not supported" errors

### Cross-Platform Blockers

1. **Audio driver** - macOS-only virtual audio device
2. **Core Audio FFI** - macOS-specific APIs
3. **File paths** - Some hardcoded macOS paths

**Recommendation:**
- Document macOS-only in README
- Or add platform abstraction layer for audio

---

## 10. Architecture Assessment

### Strengths

- **Clean separation** - Tauri backend, React frontend
- **Event-driven** - Loose coupling via event bus
- **Hot-reload** - File watcher for agent configs
- **Multi-window** - Separate windows for agents/debug

### Weaknesses

- **Singleton patterns** - AgentManager, Events, Transcription are global singletons
- **State synchronization** - Potential race between Rust state and React state
- **Resource lifecycle** - Window/session cleanup not always guaranteed
- **Error propagation** - Errors sometimes lost across Tauri boundary

### Recommendations

1. **Formalize state management** - Use Zustand or similar for frontend state
2. **Add state reconciliation** - Sync Rust and React state on reconnect
3. **Lifecycle hooks** - Ensure cleanup on all exit paths
4. **Error middleware** - Intercept all Tauri errors and log centrally

---

## 11. Known Bugs

| ID | Location | Description | Severity |
|----|----------|-------------|----------|
| 1 | `src/system/events.ts:83` | Recursive event emission throws instead of logging | Medium |
| 2 | `src/system/prompter.ts:224` | JSON parse crash if LLM returns invalid JSON | Critical |
| 3 | `src/system/agentManager.ts:176` | Window close errors silently suppressed | Low |
| 4 | `src-tauri/src/transcription/control.rs:45` | Device ID comparison doesn't validate IDs exist | Medium |
| 5 | `src-tauri/src/llm/ollama.rs:64` | 20-second timeout may be too short for large models | Low |

---

## 12. Recommendations Summary

### Immediate Actions (Week 1)

1. Fix `JSON.parse()` crash in prompter.ts
2. Add try-catch to all JSON operations
3. Replace critical `unwrap()` calls with error handling
4. Add input validation to agent config parsing

### Short Term (Weeks 2-4)

1. Setup test infrastructure (Vitest, cargo test)
2. Write tests for critical paths (agent lifecycle, transcription)
3. Remove deprecated code (llama_cpp, open_ai, model_old)
4. Fix TypeScript type safety issues

### Medium Term (Weeks 5-8)

1. Achieve 80%+ test coverage
2. Refactor large functions (<150 lines)
3. Document all public APIs
4. Optimize rendering performance

### Long Term (Months 2-3)

1. Add user-requested features
2. Cross-platform support (Windows, Linux)
3. LLM provider extensibility
4. Agent marketplace/sharing

---

## Appendix: Metrics

**Codebase Size:**
- TypeScript: 4,732 lines
- Rust: 2,349 lines
- Total: 7,081 lines

**File Counts:**
- `.tsx/.ts`: 44 files
- `.rs`: 24 files

**Complexity:**
- Average function length: ~25 lines
- Max function length: 170 lines
- Estimated tech debt: ~500 lines of deprecated/unused code

**Test Coverage:**
- Current: 0%
- Target: 80%
- Gap: ~5,600 lines needing tests
