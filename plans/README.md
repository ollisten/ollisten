# Plans Directory

This directory contains planning documents, technical analysis, and roadmaps for the Ollisten project.

## Documents

### [ROADMAP.md](./ROADMAP.md)
Comprehensive development roadmap organized into 5 phases:
- **Phase 1:** Critical Stability & Safety (error handling, type safety, security)
- **Phase 2:** Testing & Quality (test infrastructure, coverage goals)
- **Phase 3:** Code Quality & Refactoring (technical debt removal, performance)
- **Phase 4:** Documentation (inline docs, user guides)
- **Phase 5:** New Features (quality of life, advanced features, cross-platform)

Each phase includes specific tasks with acceptance criteria and priority levels.

### [ANALYSIS.md](./ANALYSIS.md)
Detailed codebase analysis covering:
- Error handling assessment with critical crash points identified
- Type safety gaps and `any` usage tracking
- Security vulnerabilities and input validation issues
- Code quality metrics and complexity analysis
- Performance bottlenecks and optimization opportunities
- Testing gaps (currently 0% coverage)
- Known bugs and technical debt inventory

## Purpose

This folder serves as a historical record of:
- **Technical decisions** - Why certain approaches were chosen
- **Project direction** - What features are prioritized and why
- **Technical debt** - Known issues and their remediation plans
- **Architecture evolution** - How the system design changes over time

## How to Use

### For Current Development
1. Check ROADMAP.md for prioritized tasks
2. Refer to ANALYSIS.md for detailed issue context
3. Use as reference when planning sprints or milestones

### For New Contributors
1. Read ANALYSIS.md to understand current state
2. Review ROADMAP.md to see what's coming next
3. Check completed phases to understand past decisions

### For Future Planning
1. Add new design documents here before major features
2. Update ROADMAP.md when priorities shift
3. Document architectural decisions (ADRs) as they're made

## Document Types

Place these document types in this folder:

- **Roadmaps** - Long-term feature and improvement plans
- **Analysis** - Codebase reviews and technical assessments
- **ADRs** - Architecture Decision Records for major technical choices
- **Proposals** - Feature proposals and design documents
- **Investigation** - Research and spike results
- **Retrospectives** - Post-mortems and lessons learned

## Naming Conventions

- Use UPPERCASE.md for top-level documents (ROADMAP.md, ANALYSIS.md)
- Use kebab-case.md for specific topics (feature-oauth-integration.md)
- Date-stamp time-sensitive documents (2025-01-15-q1-planning.md)
- Prefix ADRs with numbers (001-use-ollama-for-llm.md)

## Maintenance

- Review and update ROADMAP.md quarterly
- Archive completed phases to keep roadmap focused
- Update ANALYSIS.md when major refactoring is completed
- Keep documents current - outdated docs are worse than no docs
