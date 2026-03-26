# Quiz Builder Data and Route Proposal
Updated: 2026-03-26

## Purpose

This note translates the quiz builder product draft into:

- collection proposals
- document shapes
- route contracts
- module ownership

This is intended to reduce ambiguity before implementation starts.

## Current Implemented Reality

The repo now has a working first slice of the quiz builder. The notes below still describe the longer-term target model, but these are the contracts that currently matter in the codebase:

### Live Teacher Page Routes

- `/teacher/quizzes`
- `/teacher/quizzes/new`
- `/teacher/quizzes/:quizId/edit`
- `/teacher/quizzes/:quizId/preview`
- `/teacher/quizzes/:quizId/responses`
- `/teacher/quizzes/:quizId/analytics`

Current route meaning note:
- `/teacher/quizzes/:quizId/preview` is the saved teacher preview surface
- it is not the actual student attempt runtime route

### Live Teacher Builder API Routes

- `GET /api/quiz-builder/quizzes`
- `POST /api/quiz-builder/quizzes`
- `GET /api/quiz-builder/quizzes/:quizId`
- `PUT /api/quiz-builder/quizzes/:quizId`
- `POST /api/quiz-builder/quizzes/:quizId/publish`
- `POST /api/quiz-builder/quizzes/:quizId/close`
- `POST /api/quiz-builder/quizzes/:quizId/archive`
- `POST /api/quiz-builder/quizzes/:quizId/restore`
- `POST /api/quiz-builder/quizzes/:quizId/duplicate`
- `GET /api/quiz-builder/quizzes/:quizId/responses`
- `GET /api/quiz-builder/quizzes/:quizId/analytics`

### Live Student Runtime API Routes

- `GET /api/quizzes/:quizId`
- `POST /api/quizzes/:quizId/start`
- `PUT /api/quizzes/:quizId/attempts/:attemptId`
- `POST /api/quizzes/:quizId/attempts/:attemptId/submit`

### Current Quiz Document Shape in Use

The current builder stores both quiz sections and quiz questions inside the quiz document rather than splitting them into separate `quiz_sections`, `quiz_questions`, and `question_options` collections.

Current fields in active use:

```javascript
{
  _id: ObjectId,
  title: string,
  quizTitle: string,
  description: string,
  subject: string,
  classId: string | null,
  classLabel: string | null,
  type: "practice" | "graded" | "survey" | "exit_ticket" | "assignment_check",
  status: "draft" | "published" | "closed" | "archived",
  settings: {
    requireLogin: boolean,
    oneResponsePerStudent: boolean,
    showScoreMode: "immediate" | "after_review" | "hidden",
    randomizeQuestionOrder: boolean,
    randomizeOptionOrder: boolean,
    autoSaveProgress: boolean,
    startAt: Date | null,
    endAt: Date | null,
    timeLimitMinutes: number | null
  },
  sections: [
    {
      id: string,
      title: string,
      description: string,
      order: number
    }
  ],
  questions: [
    {
      id: string,
      sectionId: string,
      order: number, // order within the section
      type: "multiple_choice" | "checkbox" | "short_answer" | "paragraph" | "true_false",
      title: string,
      description: string,
      required: boolean,
      points: number,
      options: string[],
      correctAnswers: string[],
      allowMultiple: boolean,
      caseSensitive: boolean,
      feedbackCorrect: string,
      feedbackIncorrect: string
    }
  ],
  legacyQuestions: [
    {
      text: string,
      description: string,
      type: string,
      choices: string[],
      correctAnswer: string | string[],
      points: number,
      required: boolean
    }
  ],
  questionCount: number,
  totalPoints: number,
  responseCount: number,
  ownerUserId: ObjectId,
  ownerStudentIDNumber: string | null,
  ownerName: string,
  createdBy: ObjectId,
  isActive: boolean,
  createdAt: Date,
  updatedAt: Date,
  publishedAt: Date | null,
  closedAt: Date | null,
  archivedAt: Date | null
}
```

### Current Answer Contract

The canonical answer field is now:

- `questions[].correctAnswers`

Rules:

- `multiple_choice`: exactly 1 answer string
- `checkbox`: 2 or more answer strings
- `true_false`: exactly 1 answer string, normally `True` or `False`
- `short_answer`: 0 or more accepted answer strings
- `paragraph`: 0 or more accepted answer strings

`acceptedAnswers` should be treated as legacy input compatibility only, not as the preferred stored field.

### Current Section Contract

The builder and preview now use visible authored sections.

Rules in the implemented slice:

- old flat quizzes without `sections[]` are normalized into one default section on load
- `questions[].sectionId` must reference a valid section on save
- empty section titles fall back to `Section N`
- `legacyQuestions` remains flattened in authored display order for compatibility
- section order is fixed for runtime delivery; question randomization happens only inside each section

### Current Publish Contract

Publishing now does two things:

1. validates the saved draft quiz
2. if `classId` exists, auto-upserts one class assignment row in the class-quiz pivot

Current assignment note:
- `classId` is optional, so a quiz can publish without an assignment and be linked to a class later.

Current assignment mapping:

- quiz `settings.startAt` -> assignment `startDate`
- quiz `settings.endAt` -> assignment `dueDate`
- `assignedStudents: []` means the whole class

### Current Preview Contract

Preview now matters in two different ways in the current implementation:

1. Header/dock preview launch behavior in the builder
2. The saved teacher preview itself

Current builder preview behavior:
- preview uses the existing saved teacher preview
- preview now opens in a new tab from the unified builder dock
- preview is grouped beside `Save Draft` and `Publish` in the dock action cluster
- preview saves first when:
  - the quiz has no saved draft yet
  - the builder has unsaved changes

Current teacher preview behavior:
- route: `/teacher/quizzes/:quizId/preview`
- data source: `GET /api/quiz-builder/quizzes/:quizId`
- rendering purpose: saved teacher preview using saved quiz data
- it does not:
  - start an attempt
  - autosave answers
  - submit answers

Architectural implication:
- the preview route belongs to the teacher authoring surface
- it should not be treated as a substitute for the student runtime contract

### Current Student Runtime Normalization

Student runtime no longer depends on raw builder question structure.

Normalized student-facing question shape:

```javascript
{
  id: string,
  type: string,
  text: string,
  questionText: string,
  description: string,
  choices: string[],
  options: string[],
  required: boolean,
  points: number,
  allowMultiple: boolean
}
```

Normalized student-facing quiz payloads now also include grouped section metadata:

```javascript
{
  sections: [
    {
      id: string,
      title: string,
      description: string,
      order: number,
      questionCount: number,
      questions: Question[]
    }
  ]
}
```

The flat `quiz.questions` array still exists in the runtime response so answer submission and scoring continue to work by question id without changing the submit contract.

Important distinction:
- teacher preview consumes builder-oriented quiz shape directly
- student runtime consumes normalized delivery shape
- matching visual fidelity between them is desirable, but they are still separate contracts in the current system

### Current Scoring Rules

- `multiple_choice`: exact single choice match
- `checkbox`: exact selected-set match
- `true_false`: exact single choice match
- `short_answer`: exact accepted-answer match, case sensitivity optional
- `paragraph`: exact accepted-answer match, case sensitivity optional

The current slice uses full-credit-or-zero scoring per question.

## Proposed MongoDB Collections

### 1. `quizzes`

Purpose:
Store quiz metadata, ownership, lifecycle, and summary fields.

Suggested shape:

```javascript
{
  _id: ObjectId,
  title: string,
  description: string,
  subject: string,
  classId: string | null,
  classLabel: string | null,
  type: "practice" | "graded" | "survey" | "exit_ticket" | "assignment_check",
  status: "draft" | "published" | "closed" | "archived",
  coverBannerUrl: string | null,
  ownerUserId: ObjectId,
  ownerStudentIDNumber: string,
  ownerName: string,
  questionCount: number,
  sectionCount: number,
  totalPoints: number,
  responseCount: number,
  latestSubmissionAt: Date | null,
  settings: {
    collectStudentName: boolean,
    collectEmail: boolean,
    requireLogin: boolean,
    enrolledOnly: boolean,
    oneResponsePerStudent: boolean,
    allowMultipleAttempts: boolean,
    autoSaveProgress: boolean,
    randomizeQuestionOrder: boolean,
    randomizeOptionOrder: boolean,
    startAt: Date | null,
    endAt: Date | null,
    timeLimitMinutes: number | null,
    autoSubmitOnTimeEnd: boolean,
    showScoreMode: "immediate" | "after_review" | "hidden",
    showCorrectAnswers: boolean,
    allowEditBeforeDeadline: boolean,
    sendSubmissionReceipt: boolean
  },
  publishedAt: Date | null,
  closedAt: Date | null,
  archivedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `ownerUserId + status + updatedAt`
- `classId + status`
- `status + updatedAt`

### 2. `quiz_sections`

Purpose:
Store section order and section metadata.

Suggested shape:

```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  title: string,
  description: string,
  order: number,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `quizId + order`

### 3. `quiz_questions`

Purpose:
Store each question independently for easier reorder, duplication, and editing.

Suggested shape:

```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  sectionId: ObjectId | null,
  order: number,
  type: "multiple_choice" | "checkbox" | "short_answer" | "paragraph" | "true_false",
  title: string,
  description: string,
  required: boolean,
  points: number,
  media: {
    imageUrl: string | null,
    videoUrl: string | null
  },
  config: {
    shuffleOptions: boolean,
    caseSensitive: boolean,
    allowPartialCredit: boolean
  },
  answerKey: {
    correctOptionIds: string[],
    acceptedAnswers: string[],
    correctBoolean: boolean | null
  },
  feedback: {
    correct: string,
    incorrect: string
  },
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `quizId + order`
- `quizId + sectionId + order`

### 4. `question_options`

Purpose:
Store objective answer options separately.

Suggested shape:

```javascript
{
  _id: ObjectId,
  questionId: ObjectId,
  order: number,
  label: string,
  value: string,
  isCorrect: boolean,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `questionId + order`

### 5. `quiz_assignments`

Purpose:
Track which classes or students a quiz is available to.

Suggested shape:

```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  targetType: "class" | "student",
  classId: string | null,
  studentIDNumber: string | null,
  assignedAt: Date,
  assignedByUserId: ObjectId
}
```

Indexes:

- `quizId + targetType`
- `classId`
- `studentIDNumber`

### 6. `quiz_attempts`

Purpose:
Track attempt lifecycle and submission-level metadata.

Suggested shape:

```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  studentUserId: ObjectId | null,
  studentIDNumber: string,
  studentName: string,
  classId: string | null,
  status: "in_progress" | "submitted" | "late_submitted" | "graded" | "returned",
  attemptNumber: number,
  startedAt: Date,
  submittedAt: Date | null,
  lastSavedAt: Date | null,
  durationSeconds: number | null,
  autoSubmitted: boolean,
  score: {
    earned: number,
    possible: number,
    percentage: number
  },
  reviewState: {
    needsManualReview: boolean,
    reviewedByTeacher: boolean
  },
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `quizId + studentIDNumber + attemptNumber`
- `quizId + status`
- `studentIDNumber + quizId`

### 7. `response_answers`

Purpose:
Store per-question answers and grading outcomes.

Suggested shape:

```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  attemptId: ObjectId,
  questionId: ObjectId,
  studentIDNumber: string,
  answer: {
    selectedOptionIds: string[],
    textValue: string,
    booleanValue: boolean | null
  },
  scoring: {
    autoScore: number | null,
    manualScore: number | null,
    finalScore: number | null,
    isAutoGraded: boolean,
    requiresManualReview: boolean
  },
  teacherComment: string,
  gradedByUserId: ObjectId | null,
  gradedAt: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

- `attemptId + questionId`
- `quizId + questionId`

### 8. `question_bank`

Purpose:
Store reusable teacher or department-owned questions.

Suggested shape:

```javascript
{
  _id: ObjectId,
  ownerUserId: ObjectId,
  visibility: "private" | "department",
  subject: string,
  topic: string,
  difficulty: "easy" | "medium" | "hard" | null,
  type: string,
  title: string,
  description: string,
  tags: string[],
  questionTemplate: object,
  createdAt: Date,
  updatedAt: Date
}
```

### 9. `quiz_analytics`

Purpose:
Optional cached analytics summaries once scale grows.

Suggested shape:

```javascript
{
  _id: ObjectId,
  quizId: ObjectId,
  responseCount: number,
  averageScore: number,
  highestScore: number,
  lowestScore: number,
  averageDurationSeconds: number,
  mostMissedQuestionIds: ObjectId[],
  questionMetrics: [
    {
      questionId: ObjectId,
      correctRate: number,
      skipRate: number,
      averageScore: number
    }
  ],
  computedAt: Date
}
```

## Route Ownership Proposal

### `routes/quizDashboardRoutes.js`

Owns:

- `GET /api/quizzes`
- `POST /api/quizzes/:quizId/duplicate`
- `DELETE /api/quizzes/:quizId`
- `POST /api/quizzes/:quizId/archive`
- `POST /api/quizzes/:quizId/restore`

### `routes/quizBuilderRoutes.js`

Owns:

- `POST /api/quizzes`
- `GET /api/quizzes/:quizId`
- `PUT /api/quizzes/:quizId`
- `POST /api/quizzes/:quizId/sections`
- `PUT /api/quizzes/:quizId/sections/:sectionId`
- `DELETE /api/quizzes/:quizId/sections/:sectionId`
- `POST /api/quizzes/:quizId/questions`
- `PUT /api/quizzes/:quizId/questions/:questionId`
- `DELETE /api/quizzes/:quizId/questions/:questionId`
- `POST /api/quizzes/:quizId/questions/:questionId/duplicate`
- `POST /api/quizzes/:quizId/reorder`

### `routes/quizPublishRoutes.js`

Owns:

- `POST /api/quizzes/:quizId/publish`
- `POST /api/quizzes/:quizId/close`
- `POST /api/quizzes/:quizId/unpublish`

### `routes/quizResponseRoutes.js`

Owns:

- `POST /api/quizzes/:quizId/start`
- `GET /api/quiz-attempts/:attemptId`
- `PUT /api/quiz-attempts/:attemptId/save`
- `POST /api/quiz-attempts/:attemptId/submit`

### `routes/quizGradingRoutes.js`

Owns:

- `GET /api/quizzes/:quizId/responses`
- `GET /api/quiz-attempts/:attemptId/review`
- `PUT /api/quiz-responses/:responseId/grade`
- `POST /api/quiz-attempts/:attemptId/recompute-score`

### `routes/quizAnalyticsRoutes.js`

Owns:

- `GET /api/quizzes/:quizId/analytics`
- `GET /api/quizzes/:quizId/export.csv`

### `routes/questionBankRoutes.js`

Owns:

- `GET /api/question-bank`
- `POST /api/question-bank`
- `PUT /api/question-bank/:questionId`
- `DELETE /api/question-bank/:questionId`

## Validation Rules

### Quiz Create/Update

Require:

- title
- type
- owner

Validate:

- `title` max length
- allowed `status`
- allowed `type`
- valid timing window if start/end provided

### Publish Validation

Before publish, enforce:

- quiz has at least one question
- every required objective question has answer key configured
- open-text questions may leave accepted answers blank for manual review
- `short_answer` response-validation rules must still be internally valid when configured
- points are non-negative
- settings are internally valid

### Response Validation

Before submit, enforce:

- quiz is published
- student has access
- attempt is active
- required questions are answered
- deadline and attempt rules are respected

## Ownership and Security Rules

### Teacher

- read/write only own quizzes by default
- cannot edit archived quiz except restore path if permitted
- cannot grade quiz not owned by them

### Admin

- read all quizzes
- archive/restore any quiz
- inspect responses and analytics

### Student

- access only assigned published quizzes
- read only own attempts/submissions

## Summary Fields to Denormalize

These should live in `quizzes` for dashboard speed:

- `questionCount`
- `sectionCount`
- `totalPoints`
- `responseCount`
- `latestSubmissionAt`

These should be recomputed when quiz structure or submissions change.

## Logging Proposal

For `tblLogs`, write quiz events such as:

```javascript
{
  timestamp: new Date(),
  action: "QUIZ_PUBLISHED",
  studentIDNumber: actor.studentIDNumber,
  name: actor.name,
  quizId: quiz._id,
  quizTitle: quiz.title,
  details: "Quiz published for class BSIT-2A"
}
```

Recommended event names:

- `QUIZ_CREATED`
- `QUIZ_UPDATED`
- `QUIZ_PUBLISHED`
- `QUIZ_CLOSED`
- `QUIZ_ARCHIVED`
- `QUIZ_DUPLICATED`
- `QUIZ_RESPONSE_SUBMITTED`
- `QUIZ_RESPONSE_GRADED`

## Recommended First Implementation Set

If starting immediately, implement these collections first:

- `quizzes`
- `quiz_questions`
- `question_options`
- `quiz_attempts`
- `response_answers`

Add `quiz_sections` only when section UI is introduced.

That keeps the first version smaller while preserving room to scale cleanly later.
