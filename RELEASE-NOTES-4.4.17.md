# WSH 4.4.17 Release Notes

Date: 2026-06-25

## Highlights

This patch fixes a race condition in "Things to do Today" that could overwrite saved tasks with an empty list during component mount.

## Included
- Fixed Today checklist mount/save race in `src/components/wsh/RightSidebar.tsx`
- Added a load-complete guard so persistence only writes after the initial todo load finishes
- Prevented first-render empty-state writes from clobbering saved daily checklist items
- Version bump to `4.4.17`

## Validation Summary
- Local production build passed on `4.4.17`
- The updated right-sidebar checklist component compiles cleanly after the persistence guard fix

## Operator Impact
- Existing saved Today checklist items should stop disappearing on refresh/load
- Today checklist should behave much more reliably throughout the day

## Recommended After Upgrade
- Add a few Today checklist items
- Refresh immediately and confirm they remain
- Reopen the app later the same day and confirm they still persist
