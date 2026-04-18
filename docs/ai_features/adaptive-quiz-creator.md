# Adaptive Quiz Creator
## HelloUniversity Development Document

## 1. Overview

### 1.1 Feature Name
Adaptive Quiz Creator

### 1.2 Parent System
HelloUniversity

### 1.3 Feature Category
- AI-assisted academic tool
- Assessment creation feature
- Faculty productivity module
- Intelligent quiz drafting feature

### 1.4 Feature Summary
Adaptive Quiz Creator is an AI-assisted faculty feature inside HelloUniversity that helps instructors generate structured quiz drafts based on course context, topic, difficulty, and question type.

The generated content is not treated as final by default. Every generated item must go through instructor review before it can be saved as an approved question or used in an official quiz.

The feature is designed to:
- reduce quiz preparation time
- improve drafting speed
- support question refinement
- prepare the foundation for a reusable quiz bank
- preserve instructor control over final academic content

### 1.5 Feature Positioning
Adaptive Quiz Creator must be positioned as a faculty support feature, not an autonomous academic decision-maker.

The AI assists with draft generation.
The faculty member remains responsible for:
- accuracy
- fairness
- relevance
- approval
- final use

---

## 2. Vision and Purpose

### 2.1 Feature Vision
The long-term vision of Adaptive Quiz Creator is to become an intelligent assessment support environment where instructors can:
- generate quiz questions faster
- review and refine question quality
- save approved questions
- reuse questions across terms or sections
- rephrase questions when variation is needed
- manage assessment content more efficiently over time

### 2.2 Primary Purpose
To help faculty create editable and reviewable quiz drafts quickly while preserving academic quality control.

### 2.3 Main Goal
To provide instructors with an AI-assisted workflow for quiz generation, review, editing, approval, and future reuse.

### 2.4 Specific Goals
- reduce time spent creating quiz questions manually
- support structured quiz generation across subjects and topics
- improve consistency in question formatting
- allow instructors to review and revise AI-generated content
- support saving of approved questions for future reuse
- establish the foundation for a reusable question bank
- keep final academic control with the instructor
- make quiz creation more scalable for multiple classes and sections

---

## 3. Problem Statement

Instructors often spend significant time creating quizzes for lessons, reviews, activities, and assessments.

Common issues include:
- repetitive manual quiz writing
- inconsistent wording across questions
- difficulty producing question variations
- repeated reuse of the same questions
- limited time for creating balanced assessments
- difficulty adjusting question difficulty quickly
- lack of a structured system for storing and reusing question drafts

Adaptive Quiz Creator addresses these issues by allowing instructors to provide structured quiz requirements and receive draft questions that can be reviewed, edited, approved, stored, and reused.

---

## 4. Scope

## 4.1 Version 1 Scope
Version 1 focuses on the core controlled workflow of quiz generation and review.

### Included in Version 1
- AI-based quiz draft generation
- structured generation form for faculty
- support for selected question types
- editable display of generated quiz items
- manual review before approval
- save generated questions as draft
- approve selected questions
- store approved questions for future reuse
- basic tagging and metadata storage
- backend integration with Gemini API
- role-based access control
- generation activity logging
- practical validation of AI responses

### Excluded from Version 1
- student-facing chatbot
- general open-ended AI assistant
- direct auto-publishing of quizzes to students
- advanced question analytics
- plagiarism detection for generated questions
- deep curriculum mapping
- automated Bloom’s taxonomy classification
- multilingual generation unless added later
- student attempt analytics
- automatic grading logic
- direct exam proctoring support
- advanced duplicate detection
- document upload grounding unless intentionally added later

---

## 5. Users and Roles

## 5.1 Primary Users
- faculty members
- instructors
- authorised academic staff

## 5.2 Secondary Users
- administrators for monitoring and management
- programme coordinators or department heads if review workflows are added later

## 5.3 Non-Users in Version 1
- students
- parents
- guests
- unauthenticated users

## 5.4 Faculty Permissions
Faculty users should be able to:
- open Adaptive Quiz Creator
- submit quiz generation input
- generate quiz drafts
- view generated questions
- edit generated questions
- delete weak questions
- regenerate selected items
- save draft records
- approve questions
- store approved questions
- search approved questions later
- reuse approved questions
- request rephrasing in future supported versions

## 5.5 Admin Permissions
Admins should be able to:
- manage feature availability
- inspect generation logs
- monitor usage frequency
- review system settings
- inspect audit records if needed

## 5.6 Student Restrictions
Students must not be able to:
- access quiz generation pages
- call generation endpoints
- modify question bank records
- approve generated academic content

---

## 6. Core Feature Concept

Adaptive Quiz Creator follows a controlled workflow:

1. Instructor provides structured quiz requirements.
2. The system sends the request to the AI service.
3. The AI returns draft quiz items.
4. The instructor reviews the generated output.
5. The instructor edits, removes, or regenerates weak items.
6. The instructor saves items as draft or approves them.
7. Approved items become reusable for future academic use.

This ensures speed without giving up instructor control.

---

## 7. Core Functionalities

## 7.1 Quiz Generation
The system shall allow an authorised faculty member to generate quiz questions using structured input.

Supported inputs may include:
- course or subject
- topic
- learning objective
- difficulty level
- number of items
- question type
- optional lesson summary or source text
- optional additional instruction

## 7.2 Editable Draft Output
Generated questions must be editable before saving or approval.

Faculty must be able to:
- edit question text
- edit answer choices
- edit correct answer
- adjust wording
- improve distractors
- delete generated items
- regenerate selected items
- refine explanations if stored

## 7.3 Draft Saving
The system shall allow generated items or generation sessions to be saved as draft for later review.

## 7.4 Approval Workflow
The system shall require instructor review before a generated question becomes an approved reusable item.

## 7.5 Reuse of Approved Questions
Approved questions shall be retrievable later for reuse in future quiz creation.

## 7.6 Rephrase Support
The system should support rephrasing of existing questions in a later phase while preserving the original question relationship.

## 7.7 Difficulty Adaptation
The system should eventually support revision of questions to become:
- easier
- harder
- more conceptual
- more application-based

## 7.8 Search and Filter
Approved questions should later be searchable by:
- course
- topic
- question type
- difficulty
- keyword
- creator
- source
- date created

---

## 8. User Workflows

## 8.1 Primary Generation Workflow
1. Faculty logs into HelloUniversity.
2. Faculty opens Adaptive Quiz Creator.
3. Faculty fills out the generation form.
4. The system validates required inputs.
5. The backend builds a structured AI prompt.
6. The backend sends the prompt to Gemini API.
7. The AI returns draft quiz items.
8. The backend validates the response structure.
9. The frontend displays the items in editable form.
10. Faculty reviews the generated content.
11. Faculty edits, deletes, or regenerates items as needed.
12. Faculty saves items as draft or approves selected questions.
13. Approved questions are stored for future reuse.

## 8.2 Draft Review Workflow
1. Faculty opens saved drafts.
2. Faculty reviews draft questions.
3. Faculty edits any weak or unclear items.
4. Faculty approves selected items.
5. Approved items move to reusable storage.

## 8.3 Reuse Workflow
1. Faculty opens saved approved questions.
2. Faculty searches by topic, course, or keyword.
3. Faculty selects questions for reuse.
4. Faculty includes selected items in a new quiz workflow.
5. Faculty optionally requests rephrasing if supported.

## 8.4 Rephrase Workflow
1. Faculty opens an approved question.
2. Faculty selects the rephrase action.
3. The system sends the original question with rephrase instructions to AI.
4. AI returns a revised version.
5. Faculty compares original and revised versions.
6. Faculty approves one version.
7. The approved version is saved with parent-child relationship.

---

## 9. Input Design

## 9.1 Required Fields
Version 1 should include these required fields:
- course or subject
- topic
- difficulty level
- number of items
- question type

## 9.2 Recommended Optional Fields
- learning objective
- competency target
- lesson summary
- short source content
- additional instruction
- focus area
- wording guidance

## 9.3 Suggested Form Fields

### Course / Subject
Purpose:
Defines academic context.

### Topic
Purpose:
Defines the main lesson or content area.

### Learning Objective
Purpose:
Helps align generated questions to intended outcomes.

### Difficulty Level
Allowed values:
- easy
- medium
- hard

### Number of Items
Purpose:
Controls generation size.

### Question Type
Allowed values for Version 1:
- multiple_choice
- true_false

### Optional Source Content
Purpose:
Allows grounded generation using short lesson content.

### Additional Instruction
Examples:
- focus on basic concepts
- avoid tricky wording
- include practical examples
- make items suitable for first-year students

---

## 10. Supported Question Types

## 10.1 Recommended for Version 1
- Multiple Choice
- True or False

## 10.2 Possible Future Types
- Identification
- Matching Type
- Short Answer
- Enumeration
- Essay Prompt
- Code Interpretation
- Fill in the Blank

Version 1 should remain narrow to improve stability and validation.

---

## 11. Output Structure

## 11.1 Expected Output Fields per Question
Each generated question should ideally contain:
- `questionText`
- `questionType`
- `options` if applicable
- `correctAnswer`
- `explanation`
- `difficulty`
- `topic`
- optional `learningObjective`

## 11.2 Example Output Design for Multiple Choice
- question text
- four answer options
- one correct answer
- brief explanation
- difficulty label
- topic label

## 11.3 Example Output Design for True or False
- question text
- correct answer
- explanation
- difficulty label
- topic label

---

## 12. Review and Approval Requirements

## 12.1 Review Rules
The system shall treat all generated questions as draft content until reviewed.

## 12.2 Review Interface Requirements
Generated items should:
- be shown individually
- be editable
- be deletable
- be regeneratable
- show answer key to faculty
- show explanation to faculty
- support approve or leave as draft actions

## 12.3 Approval Rules
- no generated question shall become official by default
- no generated question shall be auto-published
- instructor approval is required before approved storage

---

## 13. Academic Safeguards

Adaptive Quiz Creator must support academic integrity.

### Safeguards
- AI-generated content must remain draft by default
- faculty remains responsible for correctness
- no student personal data shall be included in AI prompts
- no sensitive institutional data shall be included in prompts
- the system shall log major generation actions
- the system shall discourage blind acceptance of AI output

### Academic Principle
AI assists with drafting.
The instructor makes the academic decision.

---

## 14. Access Control

## 14.1 Access Rules
- all Adaptive Quiz Creator routes must require authentication
- only faculty or authorised academic roles may generate quizzes
- admin access must be explicit if allowed
- student roles must be blocked from generation endpoints
- role checks must be enforced on the backend

## 14.2 Security Reminder
API keys must never be exposed in frontend code or committed directly into source files.

---

## 15. Technical Architecture

## 15.1 Frontend Responsibilities
The frontend should handle:
- generation form display
- client-side validation
- submission state and loading indicators
- rendering generated question cards or rows
- editable fields for review
- delete action
- regenerate action
- save draft action
- approve action
- later search and reuse UI

## 15.2 Backend Responsibilities
The backend should handle:
- authentication
- role verification
- input validation
- prompt construction
- Gemini API communication
- response parsing
- response validation
- error handling
- draft storage
- approved question storage
- usage logging

## 15.3 AI Layer Responsibilities
The AI integration layer should:
- receive structured generation input
- convert it into a strict prompt
- call Gemini API
- parse the returned result
- return structured objects to the backend
- handle malformed or failed AI responses

---

## 16. Proposed Development Layers

### Layer 1: Presentation Layer
Handles:
- faculty UI
- forms
- review screens
- action buttons

### Layer 2: Application Layer
Handles:
- controllers
- validation
- orchestration
- route logic

### Layer 3: AI Service Layer
Handles:
- Gemini communication
- prompt building
- response handling

### Layer 4: Persistence Layer
Handles:
- draft storage
- approved question storage
- usage logs
- generation session history

### Layer 5: Security Layer
Handles:
- authentication
- role access
- input restrictions
- secret handling

---

## 17. Backend Module Breakdown

## 17.1 AI Configuration Module
Purpose:
Stores and exposes AI configuration.

Responsibilities:
- load API key from environment variables
- define model name
- expose configurable AI settings

Possible file:
`config/aiConfig.js`

## 17.2 AI Service Module
Purpose:
Handles the actual Gemini API call.

Responsibilities:
- initialise AI client
- send prompt
- receive response
- return raw or parsed data

Possible file:
`services/aiService.js`

## 17.3 Prompt Builder Module
Purpose:
Builds a strict quiz-generation prompt.

Responsibilities:
- transform form input into structured prompt text
- specify expected output format
- reduce ambiguity
- enforce consistency

Possible file:
`services/promptBuilder.js`

## 17.4 AI Controller
Purpose:
Coordinates the request lifecycle.

Responsibilities:
- validate request
- call prompt builder
- call AI service
- validate output
- return structured response

Possible file:
`controllers/aiController.js`

## 17.5 AI Routes
Purpose:
Defines feature endpoints.

Possible file:
`routes/aiRoutes.js`

## 17.6 Validation Middleware
Purpose:
Protects system from invalid requests.

Checks may include:
- required fields
- allowed difficulty values
- allowed question types
- safe input lengths
- item count limit

Possible file:
`middleware/validateAdaptiveQuizRequest.js`

## 17.7 Role Middleware
Purpose:
Restricts use to authorised roles.

Possible file:
`middleware/requireFacultyRole.js`

## 17.8 Storage Services
Purpose:
Separate storage logic from controllers.

Possible service files:
- `services/quizDraftService.js`
- `services/approvedQuestionService.js`
- `services/usageLogService.js`

---

## 18. API Design

## 18.1 Proposed Endpoints

### `POST /api/ai/adaptive-quiz/generate`
Purpose:
Generate quiz drafts from structured input.

### `POST /api/ai/adaptive-quiz/rephrase`
Purpose:
Rephrase an existing question.

### `POST /api/ai/adaptive-quiz/save-draft`
Purpose:
Save a generated session or selected questions as draft.

### `POST /api/ai/adaptive-quiz/approve`
Purpose:
Approve and store selected questions.

### `GET /api/ai/adaptive-quiz/drafts`
Purpose:
Retrieve existing draft sessions or draft items.

### `GET /api/ai/adaptive-quiz/questions`
Purpose:
Retrieve approved reusable questions.

---

## 19. Prompt Design Direction

The prompt must be structured and strict.

It should clearly define:
- role of the AI
- academic purpose
- course context
- topic
- difficulty
- question type
- number of items
- optional lesson content
- expected response structure
- requirement for correct answers
- requirement for short explanation per item

### Prompt Goals
- improve consistency
- reduce ambiguous responses
- encourage clean output parsing
- minimise malformed question objects

A dedicated prompt builder module is strongly recommended.

---

## 20. Database Strategy

## 20.1 Recommended Early Direction
Use MongoDB first for faster AI feature development.

## 20.2 Why MongoDB Fits Early Development
- flexible schema
- easy storage of raw AI output
- easy storage of nested question arrays
- suitable for evolving response formats
- easier for draft and prompt metadata

## 20.3 Why Supabase Fits Later Structured Use
- better for official relational academic data
- easier linking to courses, quizzes, attempts, and grades
- better for final institutional records

## 20.4 Hybrid Recommendation
Use:
- MongoDB for generation sessions, drafts, prompt logs, rephrase history
- Supabase for approved official question bank and later class-linked assessment usage

---

## 21. Core Data Groups

## 21.1 Generation Session
Purpose:
Stores one full AI generation request and response cycle.

Suggested fields:
- `generationId`
- `userId`
- `featureName`
- `course`
- `topic`
- `learningObjective`
- `difficulty`
- `questionType`
- `itemCount`
- `optionalSourceContent`
- `additionalInstruction`
- `promptText`
- `modelUsed`
- `generationStatus`
- `rawResponse`
- `parsedQuestions`
- `createdAt`
- `updatedAt`

## 21.2 Quiz Draft
Purpose:
Stores questions not yet approved.

Suggested fields:
- `draftId`
- `generationId`
- `createdBy`
- `course`
- `topic`
- `learningObjective`
- `difficulty`
- `questionType`
- `questions`
- `status`
- `createdAt`
- `updatedAt`

## 21.3 Approved Question
Purpose:
Stores reviewed reusable question items.

Suggested fields:
- `questionId`
- `createdBy`
- `course`
- `topic`
- `learningObjective`
- `questionType`
- `difficulty`
- `questionText`
- `options`
- `correctAnswer`
- `explanation`
- `tags`
- `source`
- `sourceGenerationId`
- `status`
- `parentQuestionId`
- `version`
- `approvedAt`
- `createdAt`
- `updatedAt`

## 21.4 Usage Log
Purpose:
Stores audit-related actions.

Suggested fields:
- `logId`
- `userId`
- `action`
- `targetType`
- `targetId`
- `timestamp`
- `metadata`

---

## 22. Status Design

## 22.1 Generation Session Status
- `pending`
- `completed`
- `failed`

## 22.2 Draft Status
- `draft`
- `under_review`
- `approved`
- `archived`

## 22.3 Approved Question Status
- `active`
- `revised`
- `archived`

---

## 23. Rephrase and Versioning Design

If rephrase support is added, revised questions should preserve their connection to the original version.

Suggested fields:
- `parentQuestionId`
- `version`
- `sourceType` such as:
  - `ai_generated`
  - `ai_rephrased`
  - `manually_edited`
- `rephraseReason` if needed later

This allows:
- question lineage tracking
- version comparison
- controlled variation history

---

## 24. Functional Requirements

## 24.1 Generation Requirements
- the system shall allow an authorised faculty member to generate quiz questions using structured input
- the system shall support selected question types in Version 1
- the system shall allow the faculty member to define difficulty and number of items
- the system shall allow optional source content for more grounded generation

## 24.2 Review Requirements
- the system shall display generated questions in editable form
- the system shall allow item deletion
- the system shall allow item regeneration
- the system shall allow manual editing before save
- the system shall prevent direct official use without review

## 24.3 Storage Requirements
- the system shall allow generated questions to be saved as draft
- the system shall allow selected questions to be approved and stored
- the system shall preserve metadata such as course, topic, type, and difficulty

## 24.4 Security Requirements
- the system shall require authentication for all generation actions
- the system shall restrict generation access to authorised roles
- the system shall store API keys outside application source code
- the system shall perform backend validation for all generation requests

## 24.5 Audit Requirements
- the system shall log quiz generation actions
- the system shall log approval actions
- the system shall log rephrase actions when implemented

---

## 25. Non-Functional Requirements

- secure API key handling
- acceptable response time for normal generation requests
- maintainable code structure
- clean and readable generated output display
- reliable draft and approval saving
- scalable structure for future AI tools
- resilient handling of malformed AI output
- practical user experience for faculty

---

## 26. Risks and Challenges

## 26.1 AI Content Quality Risk
The AI may produce:
- incorrect answers
- weak distractors
- confusing wording
- repeated questions
- misaligned questions

## 26.2 Overreliance Risk
Faculty may trust AI-generated content without proper review.

## 26.3 Cost and Quota Risk
Frequent usage may consume available quota or increase cost.

## 26.4 Prompt Abuse Risk
Users may submit poor, irrelevant, or excessive input.

## 26.5 Response Structure Risk
AI responses may not always match the expected format.

---

## 27. Mitigation Strategies

- require review before approval
- use strict prompt templates
- limit maximum item count per request
- validate returned question objects
- allow item-level regeneration
- log generation activity
- start with fewer question types
- keep generated items in draft state by default
- present clear faculty reminder that AI output must be checked

---

## 28. User Interface Structure

## 28.1 Section A: Header
Contains:
- feature title
- short explanation of purpose
- faculty-only indicator if needed

## 28.2 Section B: Generation Form
Suggested fields:
- course / subject
- topic
- learning objective
- difficulty
- number of items
- question type
- optional source content
- additional instruction

## 28.3 Section C: Result Area
Displays:
- generated question cards or rows
- editable question text
- editable answer choices
- correct answer
- explanation
- question actions

## 28.4 Section D: Item Actions
Actions may include:
- edit
- delete
- regenerate
- approve
- save as draft

## 28.5 Section E: Session Actions
Actions may include:
- save all as draft
- approve selected
- cancel session

## 28.6 Section F: Draft and Approved Shortcuts
May include:
- view saved drafts
- view approved questions
- search reusable questions

---

## 29. Development Phases

## 29.1 Phase 1: Secure AI Setup
Objectives:
- create AI config
- store Gemini key in environment variables
- test backend AI communication
- confirm successful response retrieval

Deliverables:
- working AI connection
- simple service-level test

## 29.2 Phase 2: Core Generation Endpoint
Objectives:
- create generation route
- validate structured request
- build prompt
- call Gemini
- return parsed results

Deliverables:
- working generation endpoint
- initial backend validation
- structured output handling

## 29.3 Phase 3: Frontend Generation Form
Objectives:
- create faculty generation page
- connect frontend to backend
- handle request loading and result display

Deliverables:
- working form
- frontend-backend integration
- visible generated results

## 29.4 Phase 4: Editable Review Interface
Objectives:
- display generated items clearly
- allow manual edits
- support delete and regenerate actions

Deliverables:
- practical review flow
- human refinement before save

## 29.5 Phase 5: Draft and Approved Storage
Objectives:
- save draft sessions
- approve selected items
- separate draft and approved records

Deliverables:
- persistent draft storage
- approved question storage
- status tracking

## 29.6 Phase 6: Reuse Foundation
Objectives:
- retrieve approved questions
- add basic search and filtering
- support selection for reuse

Deliverables:
- reusable question access
- early quiz bank foundation

## 29.7 Phase 7: Rephrase and Adaptation
Objectives:
- rephrase selected questions
- track parent-child relationship
- support revised question versions

Deliverables:
- adaptive question refinement
- question lineage support

---

## 30. Minimum Viable Product

Adaptive Quiz Creator MVP should include:
- authenticated faculty-only access
- generation form
- backend Gemini integration
- support for multiple choice and true or false
- editable result display
- save as draft
- approve selected questions
- basic storage and retrieval

This is enough to make the feature real, usable, and defensible for development.

---

## 31. Recommended Development Priority

Build in this order:
1. AI config and service
2. prompt builder
3. generate endpoint
4. request validation
5. frontend generation form
6. result rendering
7. editing workflow
8. draft saving
9. approval and storage
10. retrieval of approved questions

---

## 32. Documentation-Friendly Definition

Adaptive Quiz Creator is an AI-assisted faculty feature within HelloUniversity that generates structured quiz drafts from instructor input, supports review and editing, and enables approved questions to be stored for future academic reuse.

---

## 33. Development-Friendly Definition

Adaptive Quiz Creator is a secured backend-integrated quiz generation module for authorised faculty users. It accepts structured quiz requirements, calls the Gemini API, returns editable draft questions, and supports saving, approval, and future reuse of reviewed items.

---

## 34. Scope Reminder

Version 1 should focus only on:
- generate
- review
- edit
- save draft
- approve
- reuse foundation

Version 1 should avoid early scope expansion into:
- student AI chat
- advanced analytics
- too many question types
- direct quiz publication
- curriculum intelligence
- full quiz bank optimisation
- auto-grading and proctoring

---

## 35. Final Direction

Adaptive Quiz Creator should begin as a tightly controlled, faculty-only AI assessment drafting feature inside HelloUniversity.

Its first success metric is not how many AI functions it has.

Its first success metric is whether instructors can:
- generate usable quiz drafts
- review them quickly
- edit them confidently
- save approved questions for future use

That is the correct foundation for long-term expansion.