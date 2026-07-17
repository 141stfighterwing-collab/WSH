# WSH 4.4.13 Release Notes

Date: 2026-06-25

## Highlights

This release focuses on interaction quality: smoother mind map motion and more natural editor behavior for bullets, numbering, and checklists.

## Included
- Mind map animation path optimized to reduce per-frame DOM churn
- Node motion now updates through transform writes instead of repeated left/top layout shifts
- Counter-rotating label updates are throttled to reduce unnecessary label work every frame
- Editor list handling improved so bullet lists and numbered lists behave more like a normal note app
- Added checklist insertion directly in the editor toolbar
- Editor now normalizes list markup after input so list spacing and indentation stay more stable
- Version bump to `4.4.13`

## Validation Summary
- Local production build passed on `4.4.13`
- `/api/synthesis` remains available after the editor/mind map changes
- Release version metadata updated in package metadata and release trail

## Operator Impact
- Mind map should feel smoother, especially during orbit/rotation and hover interactions
- Users can create checklists from the toolbar instead of faking them manually
- Bullets and numbering should preserve cleaner structure during note editing

## Recommended After Upgrade
- Open the mind map with a dense note set and confirm motion feels smoother
- Test bullet lists, numbered lists, and the new checklist button in the note editor
- Confirm the editor still saves normal note content as expected
