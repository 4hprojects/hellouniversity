# HelloUniversity Quiz Builder Draft

## 1. Quiz Dashboard

This is the entry point for teachers.

### Features

- Create new quiz
- View all quizzes
- Search quizzes
- Filter by status
  - Draft
  - Published
  - Closed
  - Archived
- Duplicate existing quiz
- Delete quiz
- Preview quiz
- Open responses
- Open analytics

### Quiz Card Details

- Quiz title
- Course / subject
- Class / section
- Status
- Number of questions
- Total points
- Response count
- Last updated date

## 2. Quiz Creation Page

This should feel familiar like Google Forms.

### A. Main Layout

- Top bar with quiz title
- Left or floating question navigation
- Main editor area
- Right-side quick-add toolbar for new questions
- Tabs or sections for:
  - Questions
  - Settings
  - Responses
  - Preview

### B. Quiz Header Fields

- Quiz title
- Quiz description / instructions
- Subject / course
- Class / section
- Quiz type
  - Practice
  - Graded quiz
  - Survey
  - Exit ticket
  - Assignment check
- Cover banner optional

## 3. Question Builder

This is the core feature.

### Supported Question Types for First Version

- Multiple choice
- Checkbox
- Short answer
- Paragraph
- Dropdown
- True or false
- Identification
- Matching type
- Linear scale
- Date
- Time

### Recommended for Phase 2

- File upload
- Essay with rubric
- Code answer
- Fill in the blanks
- Ordering / sequencing
- Table-type questions
- Image-based question
- Audio/video-based question

### Per-Question Controls

- Question title
- Question description
- Required toggle
- Add image
- Add video
- Add points
- Duplicate question
- Delete question
- Move question up/down
- Shuffle options
- Mark correct answer
- Add feedback for correct answer
- Add feedback for wrong answer

### Answer Configuration

For objective questions:

- Correct answer key
- Auto-check answer
- Case sensitivity toggle for short answer
- Accept alternative answers
- Partial credit for checkbox or matching

## 4. Form Sections

This is one feature you should not skip.

### Features

- Divide quiz into sections
- Add section title and description
- Move questions between sections
- Conditional section flow later

### Why This Matters

- Good for long exams
- Easier to organise by topic
- Makes the builder feel closer to Google Forms

## 5. Quiz Settings

### General Settings

- Collect student name
- Collect email
- Require login
- Limit to enrolled students only
- One response per student
- Allow multiple attempts
- Auto-save progress
- Randomise question order
- Randomise option order

### Timing Settings

- Set start date and time
- Set end date and time
- Time limit
- Late submission rules
- Auto-submit when time ends
- Show countdown timer

### Visibility Settings

- Draft mode
- Scheduled publish
- Manual publish
- Close manually
- Archive after deadline

### Response Settings

- Show score immediately
- Show score after teacher review
- Show correct answers after submission
- Hide correct answers
- Allow students to edit responses before deadline
- Send submission receipt

### Anti-Cheating Options

- Full-screen mode suggestion
- Disable backtracking optionally
- Shuffle questions
- Shuffle choices
- Question pool random draw
- IP/device attempt logging
- Tab switch detection warning
- Copy/paste warning for essay or coding questions

## 6. Student View

The student interface should be very simple.

### Features

- Clean full-page quiz layout
- Mobile-friendly design
- Progress indicator
- Section-based navigation if allowed
- Save draft if enabled
- Answer validation before submit
- Submission confirmation page
- View score or pending review status

## 7. Response Collection

Teachers need a strong response area.

### Response Views

- Summary view
- Question-by-question view
- Individual student response view

### Response Actions

- Search student responses
- Filter submitted / missing / late
- View score
- Manual grading
- Return for revision if allowed
- Export results

### Data Shown

- Student name
- Student ID
- Submission time
- Duration taken
- Attempt number
- Score
- Status

## 8. Auto Grading and Manual Grading

### Auto Grading

- Multiple choice
- Checkbox
- True or false
- Identification
- Dropdown
- Matching if structured

### Manual Grading

- Paragraph
- Essay
- File upload
- Code answer

### Teacher Grading Tools

- Add score manually
- Add comments
- Add rubric
- Mark as reviewed
- Recompute total score

## 9. Quiz Analytics

This will make HelloUniversity stronger than a basic form builder.

### Features

- Total responses
- Average score
- Highest score
- Lowest score
- Submission rate
- Question difficulty
- Most missed questions
- Item analysis
- Completion rate
- Average completion time

### Useful Charts

- Score distribution
- Per-question correctness
- Submission timeline
- Student performance ranking

## 10. Question Bank

This is very important if teachers create many quizzes.

### Features

- Save question to bank
- Reuse question from bank
- Organise by:
  - Subject
  - Topic
  - Difficulty
  - Question type
- Search question bank
- Tag questions
- Bulk import questions
- Duplicate and edit saved questions

### Phase 2

- Shared department question bank
- Version history of questions

## 11. Import and Export

Useful for teachers who already have materials.

### Features

- Export quiz as PDF
- Export responses to Excel or CSV
- Print quiz
- Import from structured JSON
- Import from spreadsheet template
- Copy quiz link

### Phase 2

- Import from Google Forms-like structure
- Import LMS question pools

## 12. Access and Permissions

Since this is HelloUniversity, role control matters.

### Roles

- Admin
- Teacher
- Student

### Teacher Permissions

- Create quiz
- Edit own quiz
- Publish quiz
- View responses
- Grade responses

### Admin Permissions

- View all quizzes
- Manage system settings
- Audit quiz activity
- Archive or restore quizzes

### Student Permissions

- Answer assigned quiz
- View own submissions
- View own scores based on settings

## 13. Notifications

### Features

- Notify students when quiz is published
- Reminder before deadline
- Submission confirmation email
- Teacher notification for new submissions
- Notify when graded results are released

## 14. UX Features That Make It Feel Familiar

To really match the Google Forms experience, include these:

- Add question button always visible
- Drag and drop question reordering
- Duplicate question in one click
- Required toggle per question
- Live preview
- Simple cards for each question
- Clean spacing and minimal clutter
- Sticky action bar
- Auto-save while editing
- Toast message for saved changes

## 15. Suggested MVP Scope

If you want a first version that is realistic, build this first:

### MVP

- Quiz dashboard
- Create/edit quiz
- Multiple choice
- Checkbox
- Short answer
- Paragraph
- True or false
- Required toggle
- Points
- Correct answers
- Auto grading for objective items
- Manual grading for paragraph
- Publish / draft / close
- Timer
- One response per student
- Student submission page
- Teacher response list
- Basic analytics
- Export to CSV

### Phase 2

- Sections
- Matching type
- Question bank
- Random question pool
- File upload
- Rubric grading
- Advanced analytics
- Notifications
- Import tools

### Phase 3

- Coding questions
- AI-assisted quiz generation
- AI answer checking support
- Academic integrity tools
- Shared departmental banks

## 16. Suggested Database Modules

At a high level, you will likely need:

- `quizzes`
- `quiz_sections`
- `quiz_questions`
- `question_options`
- `quiz_assignments`
- `quiz_responses`
- `response_answers`
- `quiz_attempts`
- `question_bank`
- `quiz_analytics`

## 17. Smart Features You Can Add Later

These can help HelloUniversity stand out.

- Generate quiz from lesson content
- Generate distractors for multiple choice
- Suggest answer key
- Difficulty tagging
- Duplicate detection for questions
- Question readability check
- Outcome-based mapping
- Auto create remediation quiz from weak topics

## 18. Recommended Product Direction

If you want this to work well, treat it as:

- Google Forms style builder
- Plus LMS grading tools
- Plus question bank
- Plus classroom analytics

That mix makes it more useful for schools.

## Suggested Build Order

- Quiz dashboard
- Quiz builder UI
- Question types
- Settings panel
- Student answer page
- Teacher response page
- Grading
- Analytics
- Question bank
