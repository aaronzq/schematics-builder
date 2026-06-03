# GitHub Copilot Instructions

## General Rules
- Always refer to `SUMMARY.md` for the detailed design and interaction logic before analyzing and planning codes. **Update `SUMMARY.md` if documents need update after code modifications .**
- Use a helpful, collegial tone. Keep explanations brief but with enough context to understand the code.

## Project Overview
**Optical Schematics Builder** is a vanilla JS, no-build, no-framework web app (HTML + CSS + ES modules). It runs directly in the browser — there is **no build step, no package manager, no npm/node required**. Open `index.html` directly or serve via any static file server.

## Think before implementing
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.

## Simplicity first 

Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.