# WSH 4.4.18 Release Notes

Date: 2026-06-30

## Highlights

This patch fixes incomplete note search results in the main workspace UI and hardens document search so it reliably scans all stored document chunks without depending on fragile database-specific full-text behavior.

## Included
- Fixed note search result loss in `src/components/wsh/NotesGrid.tsx`
- Removed duplicate client-side note text filtering that could hide valid server/database matches
- Hardened `src/app/api/documents/search/route.ts` to use reliable database substring matching across document chunks
- Preserved phrase, boolean, fuzzy, and multi-term search behavior with safer query parsing
- Version bump to `4.4.18`

## Validation Summary
- Repository patch review completed for both note search and document search paths
- GitHub repo updated successfully with both search fixes
- Local build could not be fully executed in this environment because app dependencies were not installed in the clone (`next: not found`)
- Manual code inspection confirms the previous note-search double-filter bug is removed

## Operator Impact
- Main note search should now stop dropping valid matches from note bodies
- Document search should behave more consistently across the full stored chunk dataset
- Search behavior should now better reflect the actual database contents instead of partial client state

## Recommended After Upgrade
- Search for a rare term known to exist only in a note body and confirm the note appears
- Search for a term known to exist only in an uploaded document chunk and confirm it appears
- Test phrase, boolean, and fuzzy document searches with one known matching document each
- Refresh and repeat one note search to confirm results remain stable after reload
