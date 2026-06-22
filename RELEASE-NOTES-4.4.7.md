# WSH 4.4.7 Release Notes

Date: 2026-06-22

## Highlights

This release focuses on performance, responsiveness, and scalable note loading.

### Included
- Cursor-paginated note loading
- Shared visible-notes query path
- Scroll prefetch for additional pages
- Virtualized notes grid rendering
- Lazy notebook/detail rendering
- Full note fetch on demand for detail views
- Full note fetch on demand for editor actions
- Persistent recent-page cache in localStorage

## Validation Summary
- Repeated production builds passed successfully
- Release-prep lint command did not complete cleanly in this environment, so build validation was used as the primary release gate

## Expected User Impact
- Faster initial note loads
- Better scrolling performance for larger note collections
- Less UI jank when browsing many recent notes
- Faster warm reload/reopen behavior
- Cleaner separation between list payloads and full note content
