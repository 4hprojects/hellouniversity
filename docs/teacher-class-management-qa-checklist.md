# Teacher Class Management QA Checklist
Updated: 2026-03-24

Class under test: `______________`
Date: `______________`
Tester: `______________`

## Roles Used

- [ ] owner
- [ ] co_teacher
- [ ] teaching_assistant
- [ ] viewer
- [ ] student

## Setup

- [ ] populated class prepared
- [ ] sparse class prepared
- [ ] archived class available
- [ ] at least 2 modules exist
- [ ] at least 1 link material exists
- [ ] at least 1 note material exists
- [ ] at least 1 uploaded file/document exists
- [ ] at least 1 announcement exists
- [ ] at least 1 assigned quiz exists
- [ ] at least 2 students enrolled
- [ ] all collaborator roles assigned

## Owner

### Overview

- [ ] overview page loads
- [ ] class facts render correctly
- [ ] student/team/schedule/term KPIs render correctly
- [ ] module/material/announcement/quiz KPIs render correctly
- [ ] needs-attention cards render sensible values
- [ ] engagement section shows valid values
- [ ] recent activity renders useful entries
- [ ] quick links navigate correctly
- [ ] sparse class shows correct empty states

### Students

- [ ] students page loads
- [ ] add/remove controls visible
- [ ] valid add preview works
- [ ] invalid input shows error
- [ ] remove student works
- [ ] overview counts update after roster change

### Team

- [ ] team page loads
- [ ] add collaborator works
- [ ] role change works
- [ ] remove collaborator works
- [ ] overview team preview updates

### Modules

- [ ] modules page loads
- [ ] add module works
- [ ] edit module works
- [ ] hide/show works
- [ ] reorder persists after refresh
- [ ] rapid reorder does not corrupt order
- [ ] delete module unlinks materials instead of deleting them

### Materials

- [ ] materials page loads
- [ ] add link material works
- [ ] add note material works
- [ ] upload document works
- [ ] upload file works
- [ ] uploaded filename/size/link render
- [ ] edit material metadata works
- [ ] replace uploaded file works
- [ ] remove uploaded file works
- [ ] hide/show works
- [ ] reorder persists after refresh
- [ ] delete works
- [ ] invalid upload type handled correctly
- [ ] oversize upload handled correctly

### Settings

- [ ] settings page loads
- [ ] self-enrollment save works
- [ ] discussion save works
- [ ] late policy save works
- [ ] grade visibility save works
- [ ] refresh shows persisted settings
- [ ] join-code regeneration works
- [ ] archive works
- [ ] restore works

### Announcements

- [ ] announcements page loads
- [ ] create announcement works
- [ ] edit announcement works
- [ ] delete announcement works
- [ ] discussion/comment behavior works
- [ ] overview recent activity reflects announcement changes

## Co-Teacher

- [ ] overview loads
- [ ] insights visible
- [ ] roster management allowed
- [ ] team governance hidden/blocked
- [ ] modules management allowed
- [ ] materials upload/edit/reorder/delete allowed
- [ ] settings save allowed
- [ ] join-code regeneration hidden/blocked
- [ ] archive/restore hidden/blocked
- [ ] can create announcement
- [ ] can edit/delete own announcement
- [ ] cannot edit/delete owner announcement

## Teaching Assistant

- [ ] overview loads
- [ ] insights visible
- [ ] students page is read-only
- [ ] team page is read-only
- [ ] modules management allowed
- [ ] materials upload/edit/reorder/delete allowed
- [ ] settings page is read-only
- [ ] join-code/lifecycle actions hidden
- [ ] announcements are read-only

## Viewer

- [ ] overview loads
- [ ] insights visible
- [ ] students page is read-only
- [ ] team page is read-only
- [ ] modules page is read-only
- [ ] materials page is read-only
- [ ] settings page is read-only
- [ ] announcements page is read-only

## Student

- [ ] class detail page loads
- [ ] visible materials appear
- [ ] hidden materials do not appear
- [ ] uploaded file opens/downloads correctly
- [ ] link/video materials open correctly
- [ ] note materials render sensibly
- [ ] announcements still work
- [ ] archived class behavior is acceptable

## Archive / Restore Regression

- [ ] archived class still loads where expected
- [ ] teacher materials behavior acceptable while archived
- [ ] teacher announcements behavior acceptable while archived
- [ ] student class detail behavior acceptable while archived
- [ ] restore returns normal behavior

## Cross-Page Consistency

- [ ] material changes update overview counts
- [ ] announcement changes update overview counts/activity
- [ ] roster changes update overview counts
- [ ] role changes affect visible controls after reload/login

## Failure Cases

- [ ] double-click save does not duplicate mutation
- [ ] double-click upload does not duplicate upload
- [ ] double-click reorder does not corrupt order
- [ ] refresh after mutation shows persisted state
- [ ] two-tab editing does not cause obvious bad state
- [ ] expired/invalid session behavior is acceptable

## Notes

- `____________________________________________________________`
- `____________________________________________________________`
- `____________________________________________________________`
