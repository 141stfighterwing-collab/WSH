# WSH 4.4.14 Release Notes

Date: 2026-06-25

## Highlights

This release upgrades the old analytics-heavy dashboard into a more actionable Full Intelligence Board. The new dashboard is designed to feel like a command center instead of a passive report surface.

## Included
- Full Intelligence Board redesign in `src/components/wsh/WSHKeepsDashboard.tsx`
- New command-center framing for the dashboard
- New "What Matters Now" section highlighting:
  - stale notes needing review
  - action/today/urgent-style notes
  - recent burst activity
  - checklist-oriented content
- New Operational Signals section with workspace-health indicators
- New Active Work Queue section for notes most likely to matter next
- New Recent Intelligence section for high-signal notes based on structure, tags, and note density
- Existing charts preserved and reorganized into a more tactical board layout
- Version bump to `4.4.14`

## Validation Summary
- Local production build passed on `4.4.14`
- Dashboard compiles cleanly with the new command-center layout
- Existing charting and note-derived intelligence paths remain active

## Operator Impact
- Dashboard should feel more actionable and less like a static analytics page
- Users can see what needs review, what looks urgent, and which notes carry the most signal at a glance
- The workspace now has a more obvious executive/operations surface for daily use

## Recommended After Upgrade
- Open the dashboard on a realistic note set and confirm the command-center layout feels useful
- Verify the What Matters Now and Active Work Queue sections are surfacing the right notes
- Confirm charts still render correctly in dark mode and normal mode
