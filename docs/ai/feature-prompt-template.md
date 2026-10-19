# Feature request template

Copy and fill the following:

```text
Feature: <requested behavior>
Acceptance criteria: <observable outcomes>
Platform scope: <optional explicit scope; otherwise apply AGENTS.md cross-platform default>
Constraints: <optional business rules or exclusions>

Follow AGENTS.md and the relevant specialized documentation. Inspect existing
code and actual platform support before editing. Trace affected modules, data
flow and all consumers; extend existing logic instead of duplicating it.
Provide an impact map and concise plan, including shared layers, platform
adapters, offline behavior, permissions and compatibility where relevant.
Implement the requested scope and required shared dependencies using established
conventions. For missing platforms, add foundation only if in scope; otherwise
name the blocker and follow-up without claiming support.
Update relevant tests, API contracts, migrations and documentation. Run available
validation commands. Report changed files, affected consumers, implemented versus
verified platform coverage, actual check results, limitations and blockers.
```
