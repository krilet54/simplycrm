---
name: web-performance-diagnosis
description: 'Diagnose and fix real web app performance bottlenecks in React, Next.js, Node, and Supabase/Postgres. Use when pages are slow, APIs have high p95 latency, dashboards feel laggy, or production users report degraded performance. Prioritizes exact causes, impact-ranked fixes, code-level optimizations, and measurable validation.'
argument-hint: 'Describe page/endpoint, symptoms, baseline metrics, and recent changes.'
---

# Web Performance Diagnosis

Use this skill to find and fix concrete performance bottlenecks in production systems.

## Output Contract
- Restate the problem with scope and severity.
- Identify exact likely bottlenecks by layer: frontend, backend, database, network.
- Rank issues high to low impact with rationale.
- Provide focused code-level fixes for critical paths only.
- Provide a validation plan with before/after metrics and profiling steps.

## Required Process

### 1) Problem Breakdown
1. Restate the issue clearly, including user-visible symptom and affected flow.
2. Record baseline signals if available:
   - Frontend: LCP, INP, hydration time, JS bundle size, render count.
   - Backend: p50/p95 latency, error rate, throughput.
   - Database: query latency, rows scanned, lock/wait time.
   - Network: payload size, request count, cache hit ratio.
3. Segment potential layers:
   - Frontend (rendering/state/chunking)
   - Backend (handler complexity/N+1/fan-out)
   - Database (query plans/indexes)
   - Network (chatty APIs/payload bloat/caching)

### 2) Bottleneck Identification (Exact, Not Generic)
1. Name concrete causes with evidence or strongest hypothesis.
2. Explicitly check for:
   - Slow queries and sequential DB round trips
   - Missing/ineffective indexes
   - Unnecessary React re-renders and unstable props
   - Excessive API calls or waterfall fetching
   - Oversized payloads and over-fetching
   - Inefficient state management causing broad invalidations
3. Include where the cost appears (client CPU, server CPU, DB I/O, network RTT).

### 3) Prioritization
1. Rank findings by impact first, effort second.
2. Use this prioritization order when ties exist:
   - High: DB query/index fixes, request fan-out reduction, render storm elimination
   - Medium: payload trimming, caching, batching
   - Low: micro-optimizations and minor refactors
3. For each item, state expected gain in practical terms (for example: reduced p95 latency or fewer renders).

### 4) Code-Level Fixes (Critical Parts Only)
1. Rewrite only the hot path; avoid broad rewrites unless required.
2. Provide targeted patches using proven patterns:
   - React: memoization, stable callbacks/selectors, virtualization for long lists
   - Next.js/Node: route-level caching, batched fetches, parallelized I/O, response shaping
   - Postgres/Supabase: index design, query simplification, limit/select hygiene, avoid N+1
3. Keep examples minimal and production-safe.

### 5) Performance Strategy
1. Suggest practical architecture upgrades only when bottlenecks justify them:
   - Read-through caching for repeated expensive reads
   - Pre-aggregation/materialized views for heavy analytics
   - Async/offline processing for non-critical synchronous work
2. Tie each strategy to a specific bottleneck and metric.

### 6) Validation
1. Define before/after metrics and measurement windows.
2. Validate with the right tools:
   - React Profiler and browser Performance panel
   - Next.js/Supabase logs, tracing, and endpoint timing
   - `EXPLAIN (ANALYZE, BUFFERS)` for critical Postgres queries
3. Confirm no regressions in correctness, error rate, and user flow latency.

## Decision Branches
- If frontend interaction is slow but API latency is normal: inspect re-renders, component tree churn, and client-side data volume first.
- If API p95 is high with high DB time: inspect query plans, indexes, and DB round trips first.
- If API p95 is high with low DB time: inspect server-side fan-out, serialization cost, and upstream dependencies.
- If all layers look moderate but UX feels slow: inspect request waterfalls, hydration cost, and cache misses.

## Completion Criteria
- No vague recommendations.
- Every major recommendation maps to a named bottleneck.
- Top fixes are impact-ranked and implementable.
- At least one measurable validation method is provided per high-impact fix.

## Response Style Rules
- Be direct, technical, and concise.
- Treat the system as production with real users.
- Prefer specific diagnosis plus targeted patch over generic best-practice lists.