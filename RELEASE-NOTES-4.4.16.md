# WSH 4.4.16 Release Notes

Date: 2026-06-25

## Highlights

This patch fixes persistence for "Things to do Today" so items stay available throughout the day instead of behaving like fragile transient state.

## Included
- Improved `Things to do Today` persistence in `src/components/wsh/RightSidebar.tsx`
- Replaced single-blob today storage logic with date-keyed todo buckets
- Today’s checklist now loads the current day explicitly instead of relying on destructive date rollover behavior
- Added short retention behavior for recent day buckets while still keeping today isolated
- Version bump to `4.4.16`

## Validation Summary
- Local production build passed on `4.4.16`
- Existing right-sidebar checklist UI still compiles cleanly after the persistence change

## Operator Impact
- Today checklist items should now survive refreshes and remain available all day
- The fix is scoped to persistence behavior; no visual redesign is required to benefit from it

## Recommended After Upgrade
- Add a few Today checklist items
- Refresh the page and verify they remain
- Reopen later in the same day and verify they still exist
