# WSH 4.4.15 Release Notes

Date: 2026-06-25

## Highlights

This release expands the Full Intelligence Board with more graphs and smoother chart animation so the dashboard feels more fluid and visually informative.

## Included
- Added more intelligence-board graphs in `src/components/wsh/WSHKeepsDashboard.tsx`
- New Creation Rhythm chart for hour-of-day note creation patterns
- New Type Signal Radar chart for comparing note-type density and word weight
- Smoothed animation settings across the dashboard chart set
- Improved motion/easing for area, line, pie, radar, and bar charts
- Version bump to `4.4.15`

## Validation Summary
- Local production build passed on `4.4.15`
- Additional Recharts components compile cleanly in the dashboard
- Existing dashboard data sources remain intact after the chart expansion

## Operator Impact
- Dashboard should feel more alive and easier to scan visually
- Chart surfaces should animate more fluidly instead of feeling abrupt or static
- The intelligence board now exposes more pattern-recognition views at a glance

## Recommended After Upgrade
- Open the Full Intelligence Board and confirm chart animations feel smooth on your device
- Check the new Creation Rhythm and Type Signal Radar sections with a realistic note dataset
- Confirm dark-mode readability still feels good across the expanded chart set
