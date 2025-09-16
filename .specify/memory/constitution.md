# DNS Bench Web Constitution

## Core Principles

### I. User-First Performance Focus
Every feature must demonstrably improve DNS performance analysis for users; Performance data must be accurate, real-time, and actionable; No feature ships without validated DNS benchmarking capability

### II. Real-Time Transparency
All DNS testing operations must provide live progress updates; Users must see exactly what domains are being tested and why; WebSocket connections ensure sub-100ms update latency

### III. Cross-Platform Accessibility (NON-NEGOTIABLE)
Web application must work on desktop, tablet, and mobile; All features accessible via keyboard navigation; Screen reader compatibility required for all components

### IV. Data Accuracy & Validation
DNS benchmark results must be statistically valid; Multiple measurement rounds required for reliability; Input validation prevents invalid DNS server configurations

### V. Containerized Development
All development occurs within Docker containers; No local installation dependencies beyond Docker; Development environment must be reproducible across machines

## Security & Privacy Standards

DNS queries must not leak sensitive information; No DNS server credentials stored in browser; All API endpoints require proper input sanitization; WebSocket connections use secure protocols in production

## Performance Requirements

Benchmark completion time under 30 seconds for standard tests; UI responsiveness under 100ms for all interactions; Memory usage under 256MB during typical operation; Support for 10+ concurrent benchmark sessions

## Technology Constraints

Modern web standards only (ES2022+, CSS Grid/Flexbox); TypeScript required for all frontend and backend code; shadcn/ui components for consistent design system; Docker containers for all services

## Development Workflow

spec-kit methodology drives all feature development; Specifications written before any implementation; All features require acceptance criteria and test cases; Constitution compliance verified in all code reviews

## Governance

Constitution supersedes all coding preferences and technical opinions; Feature requests must align with user-first performance focus; Breaking changes require specification update and approval process; Use CLAUDE.md for runtime development guidance and context7 integration

**Version**: 1.0.0 | **Ratified**: 2024-09-15 | **Last Amended**: 2024-09-15