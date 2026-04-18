# Announcement Draft Assistant
## HelloUniversity Development Document

## 1. Overview

### 1.1 Feature Name
Announcement Draft Assistant

### 1.2 Parent System
HelloUniversity

### 1.3 Feature Category
- AI-assisted faculty tool
- Academic communication support feature
- Faculty productivity module
- Intelligent drafting feature

### 1.4 Feature Summary
Announcement Draft Assistant is an AI-assisted faculty feature inside HelloUniversity that helps instructors draft, rewrite, refine, shorten, and improve academic announcements.

The feature is designed to support faster and clearer communication between faculty and students while keeping final control in the hands of the instructor.

AI-generated output must be treated as draft content only. Every generated announcement must be reviewed and edited by the faculty member before posting or sending.

### 1.5 Feature Positioning
Announcement Draft Assistant must be positioned as a communication support feature, not an automatic announcement publisher.

The AI helps draft or improve the message.
The faculty member remains responsible for:
- correctness
- clarity
- completeness
- tone
- timing
- final posting or release

---

## 2. Vision and Purpose

### 2.1 Feature Vision
The long-term vision of Announcement Draft Assistant is to become a reliable academic communication aid that helps faculty prepare clear, structured, and audience-appropriate announcements with less manual effort.

Over time, the feature may support richer communication workflows such as saved templates, guided announcement types, rewrite history, and reusable notice formats.

### 2.2 Primary Purpose
To help faculty create and refine academic announcements more quickly while preserving message quality and instructor control.

### 2.3 Main Goal
To provide instructors with an AI-assisted workflow for announcement drafting, rewriting, shortening, tone adjustment, and review before posting.

### 2.4 Specific Goals
- reduce repetitive writing work for faculty
- improve clarity and structure of announcements
- help instructors prepare notices faster
- support different announcement tones and lengths
- improve consistency in faculty-to-student communication
- reduce time spent rewriting or rewording notices
- preserve manual review before final posting

---

## 3. Problem Statement

Faculty members often need to write announcements for:
- class reminders
- quiz and exam notices
- schedule changes
- submission deadlines
- class suspensions
- room changes
- consultation schedules
- activity instructions

These messages are often written under time pressure and may become:
- too long
- too brief
- unclear
- repetitive
- inconsistent in tone
- poorly structured

Announcement Draft Assistant addresses this problem by helping faculty generate and refine announcement drafts from structured input or from an existing raw message.

---

## 4. Scope

## 4.1 Version 1 Scope
Version 1 focuses on drafting and rewriting announcements through a controlled faculty-only workflow.

### Included in Version 1
- draft new academic announcements
- rewrite existing raw announcement text
- shorten long announcements
- improve clarity of notices
- adjust tone of announcements
- provide editable output
- require faculty review before use
- role-based access control
- backend integration with Gemini API
- basic activity logging
- practical input validation

### Excluded from Version 1
- direct automatic posting to students
- scheduled announcement sending
- translation features
- announcement analytics
- auto-reply generation
- student-facing communication assistant
- multi-channel messaging automation
- push notification logic
- email sending integration through AI feature itself
- institution-wide template governance unless added later

---

## 5. Users and Roles

## 5.1 Primary Users
- faculty members
- instructors
- authorised academic staff

## 5.2 Secondary Users
- administrators if monitoring or configuration is added later
- programme heads if content review workflows are added later

## 5.3 Non-Users in Version 1
- students
- parents
- external guests
- unauthenticated users

## 5.4 Faculty Permissions
Faculty users should be able to:
- open Announcement Draft Assistant
- submit announcement details
- generate announcement drafts
- rewrite existing messages
- shorten or simplify draft text
- adjust tone
- edit AI-generated output
- regenerate a draft when needed
- copy or save the final draft manually
- optionally save draft records if implemented

## 5.5 Admin Permissions
Admins may later be allowed to:
- manage feature availability
- inspect usage logs
- manage prompt configuration or usage policy
- review audit records if necessary

## 5.6 Student Restrictions
Students must not be able to:
- access official announcement drafting tools
- generate faculty announcements
- call announcement drafting endpoints for official academic communication

---

## 6. Core Feature Concept

Announcement Draft Assistant follows a controlled faculty workflow:

1. Faculty provides the announcement context or raw text.
2. The system sends the request to the AI service.
3. The AI returns a draft announcement.
4. Faculty reviews the output.
5. Faculty edits, regenerates, or shortens the result if needed.
6. Faculty manually posts or uses the final version.

This keeps the drafting fast while ensuring that the faculty member remains responsible for the final message.

---

## 7. Core Functionalities

## 7.1 New Announcement Drafting
The system shall allow a faculty member to generate a new academic announcement based on structured input.

Possible input may include:
- announcement topic
- course or class
- audience
- important details
- deadline or schedule information
- tone preference
- length preference
- purpose of the message

## 7.2 Rewrite Existing Announcement
The system shall allow a faculty member to paste an existing draft and request a clearer, more organised, or more student-friendly rewrite.

## 7.3 Shorten Announcement
The system shall allow a faculty member to shorten a long announcement while preserving essential meaning.

## 7.4 Tone Adjustment
The system shall support request types such as:
- make it more formal
- make it more concise
- make it student-friendly
- make it clearer
- make it more professional
- make it more direct

## 7.5 Editable Draft Output
Generated output must be editable before use.

Faculty should be able to:
- revise wording
- remove unnecessary parts
- add missing details
- correct factual information
- improve clarity further
- regenerate the whole draft if needed

## 7.6 Optional Draft Saving
Later versions may allow the generated message to be saved as draft inside HelloUniversity before posting.

---

## 8. User Workflows

## 8.1 New Announcement Workflow
1. Faculty logs into HelloUniversity.
2. Faculty opens Announcement Draft Assistant.
3. Faculty enters key announcement details.
4. The system validates the input.
5. The backend builds a structured prompt.
6. The backend sends the request to Gemini API.
7. AI returns a draft announcement.
8. The frontend displays the result in editable form.
9. Faculty reviews and edits the draft.
10. Faculty copies, saves, or posts the final version manually.

## 8.2 Rewrite Workflow
1. Faculty opens Announcement Draft Assistant.
2. Faculty pastes an existing announcement.
3. Faculty selects a rewrite goal such as clearer, shorter, or more formal.
4. The backend builds a rewrite prompt.
5. AI returns a revised version.
6. Faculty reviews and edits the new draft.
7. Faculty uses the final message manually.

## 8.3 Tone Adjustment Workflow
1. Faculty enters or pastes an announcement.
2. Faculty chooses a tone preference.
3. The system sends the rewrite request to AI.
4. AI returns a revised message in the requested tone.
5. Faculty reviews and edits the result before use.

---

## 9. Input Design

## 9.1 Required Fields for Draft Generation
Version 1 may require:
- announcement topic or purpose
- intended audience
- important details

## 9.2 Recommended Optional Fields
- course or class
- deadline or schedule
- tone preference
- length preference
- raw announcement text
- posting context
- additional instruction

## 9.3 Suggested Form Fields

### Announcement Topic / Purpose
Purpose:
Defines the main purpose of the message.

Examples:
- quiz reminder
- schedule change
- class suspension
- deadline notice
- project submission reminder

### Course / Class
Purpose:
Adds academic context.

### Intended Audience
Purpose:
Clarifies who will receive the message.

Examples:
- Section A students
- all students in WEBSYS2
- thesis group members

### Important Details
Purpose:
Stores the core facts that must appear in the message.

### Deadline / Date / Time
Purpose:
Improves accuracy for time-sensitive notices.

### Tone Preference
Possible values:
- formal
- concise
- student-friendly
- professional
- direct

### Length Preference
Possible values:
- short
- medium
- detailed

### Raw Message to Rewrite
Purpose:
Allows a faculty member to paste an existing draft for improvement.

### Additional Instruction
Examples:
- keep it polite
- make it easy to understand
- highlight the deadline clearly
- mention that late submissions will not be accepted

---

## 10. Expected Output Structure

## 10.1 Output Expectations
Each generated result should ideally contain:
- a clear announcement body
- accurate integration of provided details
- readable sentence structure
- appropriate tone
- concise or detailed style based on the request

## 10.2 Output Modes
The system may generate:
- a full new announcement draft
- a rewritten version of existing text
- a shortened version
- a more formal version
- a more student-friendly version

## 10.3 Output Presentation
The frontend should show the generated result in an editable text area or editor so the faculty member can revise it before use.

---

## 11. Review and Approval Requirements

## 11.1 Review Rules
Every generated announcement must be treated as draft content.

## 11.2 Review Interface Requirements
The draft should:
- be editable
- be copyable
- be regeneratable
- be manually reviewable before use

## 11.3 Posting Rules
- the system shall not auto-post AI output in Version 1
- faculty review is required before final release
- the final announcement remains the responsibility of the faculty member

---

## 12. Communication Safeguards

Announcement Draft Assistant must support responsible academic communication.

### Safeguards
- AI output must remain draft by default
- faculty remains responsible for correctness and context
- no sensitive student data shall be included in prompts
- no automatic posting shall happen in Version 1
- the system should log major usage actions where practical
- time-sensitive details should be reviewed manually before posting

### Communication Principle
AI assists with drafting.
The faculty member makes the final communication decision.

---

## 13. Access Control

## 13.1 Access Rules
- all announcement drafting routes must require authentication
- only faculty or authorised academic roles may use the feature
- admin access must be explicit if allowed
- students must be blocked from official announcement drafting endpoints
- role checks must be enforced on the backend

## 13.2 Security Reminder
API keys must never be exposed in frontend code or committed directly into source files.

---

## 14. Technical Architecture

## 14.1 Frontend Responsibilities
The frontend should handle:
- drafting form display
- optional raw text input for rewrite
- selection of tone and length
- loading indicators
- result rendering
- editable output
- regenerate action
- copy or save action if added

## 14.2 Backend Responsibilities
The backend should handle:
- authentication
- role verification
- input validation
- prompt construction
- Gemini API communication
- response parsing
- response validation
- error handling
- optional logging or draft saving

## 14.3 AI Layer Responsibilities
The AI integration layer should:
- receive structured announcement input
- build a strict drafting or rewriting prompt
- call Gemini API
- return a clean draft result
- handle malformed or failed AI responses gracefully

---

## 15. Proposed Development Layers

### Layer 1: Presentation Layer
Handles:
- faculty form input
- result display
- editing workflow

### Layer 2: Application Layer
Handles:
- controllers
- validation
- request handling
- route orchestration

### Layer 3: AI Service Layer
Handles:
- Gemini communication
- prompt building
- response formatting

### Layer 4: Persistence Layer
Handles:
- optional draft storage
- usage logs
- saved announcement drafts if added

### Layer 5: Security Layer
Handles:
- authentication
- role access
- input restrictions
- secret handling

---

## 16. Backend Module Breakdown

## 16.1 AI Configuration Module
Purpose:
Stores and exposes AI configuration.

Responsibilities:
- load API key from environment variables
- define model name
- expose AI-related configuration

Possible file:
`config/aiConfig.js`

## 16.2 AI Service Module
Purpose:
Handles the actual Gemini API call.

Responsibilities:
- initialise AI client
- send prompt
- receive response
- return result text or parsed object

Possible file:
`services/aiService.js`

## 16.3 Prompt Builder Module
Purpose:
Builds structured announcement drafting and rewriting prompts.

Responsibilities:
- transform form input into consistent prompt text
- specify output expectations
- reduce ambiguity
- support different modes such as draft, rewrite, shorten, tone-adjust

Possible file:
`services/announcementPromptBuilder.js`

## 16.4 AI Controller
Purpose:
Coordinates request lifecycle.

Responsibilities:
- validate request
- call prompt builder
- call AI service
- validate output
- return structured response

Possible file:
`controllers/announcementAiController.js`

## 16.5 AI Routes
Purpose:
Defines feature endpoints.

Possible file:
`routes/announcementAiRoutes.js`

## 16.6 Validation Middleware
Purpose:
Protects the system from invalid requests.

Checks may include:
- required fields
- safe text length
- valid tone values
- valid mode values
- non-empty announcement content for rewrite mode

Possible file:
`middleware/validateAnnouncementAiRequest.js`

## 16.7 Role Middleware
Purpose:
Restricts feature usage to authorised roles.

Possible file:
`middleware/requireFacultyRole.js`

---

## 17. API Design

## 17.1 Proposed Endpoints

### `POST /api/ai/announcement/generate`
Purpose:
Generate a new announcement draft from structured input.

### `POST /api/ai/announcement/rewrite`
Purpose:
Rewrite an existing announcement draft.

### `POST /api/ai/announcement/shorten`
Purpose:
Shorten an existing long announcement.

### `POST /api/ai/announcement/adjust-tone`
Purpose:
Change the tone of an existing message.

### `POST /api/ai/announcement/save-draft`
Purpose:
Optional later support for saving draft announcements.

### `GET /api/ai/announcement/drafts`
Purpose:
Optional later retrieval of saved announcement drafts.

---

## 18. Prompt Design Direction

The prompt should be structured and clear.

It should define:
- role of the AI
- academic context
- announcement purpose
- audience
- required details
- requested tone
- requested length
- rewrite or drafting mode
- requirement to keep the output clear and complete

### Prompt Goals
- improve clarity
- reduce ambiguity
- preserve provided facts
- avoid missing deadlines or schedule details
- support clean output for faculty review

A dedicated announcement prompt builder is recommended.

---

## 19. Database Strategy

## 19.1 Recommended Early Direction
Announcement Draft Assistant may work without its own dedicated storage in the earliest version if the goal is only to generate and copy drafts.

## 19.2 If Draft Storage Is Added
MongoDB is a practical option for:
- generated announcement drafts
- rewrite history
- prompt metadata
- usage logs

## 19.3 Suggested Reasoning
This feature produces flexible text drafts rather than highly relational academic records, so MongoDB fits well if storage is added later.

---

## 20. Core Data Groups

## 20.1 Generation Session
Purpose:
Stores one request-response cycle for announcement drafting.

Suggested fields:
- `generationId`
- `userId`
- `featureName`
- `mode`
- `announcementTopic`
- `course`
- `audience`
- `importantDetails`
- `tonePreference`
- `lengthPreference`
- `rawInputText`
- `promptText`
- `modelUsed`
- `generationStatus`
- `rawResponse`
- `finalDraftText`
- `createdAt`
- `updatedAt`

## 20.2 Saved Draft
Purpose:
Stores an announcement draft if save support is implemented.

Suggested fields:
- `draftId`
- `generationId`
- `createdBy`
- `title`
- `mode`
- `draftText`
- `status`
- `createdAt`
- `updatedAt`

## 20.3 Usage Log
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

## 21. Status Design

## 21.1 Generation Session Status
- `pending`
- `completed`
- `failed`

## 21.2 Draft Status
- `draft`
- `archived`

---

## 22. Functional Requirements

## 22.1 Drafting Requirements
- the system shall allow an authorised faculty member to generate a new announcement draft using structured input
- the system shall allow a faculty member to specify tone and length preferences
- the system shall allow the inclusion of important announcement details

## 22.2 Rewrite Requirements
- the system shall allow a faculty member to paste an existing announcement for rewrite
- the system shall support clearer, shorter, or more formal rewrites
- the system shall return editable output

## 22.3 Review Requirements
- the system shall display generated output in editable form
- the system shall allow regeneration of the output
- the system shall require human review before final use

## 22.4 Security Requirements
- the system shall require authentication for all drafting actions
- the system shall restrict access to authorised roles
- the system shall store API keys outside source code
- the system shall validate backend inputs before AI requests

## 22.5 Audit Requirements
- the system shall log drafting actions where practical
- the system shall log rewrite actions where practical
- the system shall log saved draft actions if storage is implemented

---

## 23. Non-Functional Requirements

- secure API key handling
- acceptable response time for normal drafting requests
- maintainable code structure
- editable output presentation
- clear and readable interface
- reliable AI request handling
- resilience against malformed AI responses
- scalable structure for future communication tools

---

## 24. Risks and Challenges

## 24.1 Content Accuracy Risk
The AI may omit or misstate details if the input is incomplete or unclear.

## 24.2 Tone Mismatch Risk
The generated message may not fully match the intended instructor tone.

## 24.3 Overreliance Risk
Faculty may rely too heavily on the first draft without checking it carefully.

## 24.4 Cost and Quota Risk
Frequent usage may consume quota or increase cost.

## 24.5 Prompt Misuse Risk
Poor input may produce weak or irrelevant drafts.

---

## 25. Mitigation Strategies

- require manual faculty review before posting
- use strict prompt templates
- encourage structured input
- validate required fields
- allow quick regeneration
- keep posting manual in Version 1
- log usage where practical
- remind users that AI output is draft content

---

## 26. User Interface Structure

## 26.1 Section A: Header
Contains:
- feature title
- short feature description
- faculty-only indicator if needed

## 26.2 Section B: Draft Form
Suggested fields:
- announcement topic
- audience
- course or class
- important details
- date or deadline
- tone preference
- length preference

## 26.3 Section C: Rewrite Form
Suggested fields:
- raw announcement text
- rewrite goal
- tone preference
- length preference

## 26.4 Section D: Result Area
Displays:
- generated draft
- editable text area
- regenerate option
- copy option
- optional save draft action

## 26.5 Section E: Action Controls
Possible actions:
- generate
- rewrite
- shorten
- adjust tone
- regenerate
- copy
- save draft later if supported

---

## 27. Development Phases

## 27.1 Phase 1: Secure AI Setup
Objectives:
- create AI config
- store Gemini key in environment variables
- test backend AI communication

Deliverables:
- working AI connection
- basic service-level test

## 27.2 Phase 2: Draft Generation Endpoint
Objectives:
- create generation route
- validate structured request
- build drafting prompt
- call Gemini
- return draft result

Deliverables:
- working draft generation endpoint
- initial validation logic

## 27.3 Phase 3: Rewrite and Tone Endpoints
Objectives:
- create rewrite logic
- create shorten logic
- create tone-adjust logic

Deliverables:
- working text transformation support
- usable communication refinement flow

## 27.4 Phase 4: Frontend Drafting Page
Objectives:
- create faculty drafting interface
- support draft and rewrite modes
- render editable output

Deliverables:
- working user interface
- editable result area
- regenerate support

## 27.5 Phase 5: Optional Draft Saving
Objectives:
- store draft records if needed
- retrieve previous drafts later

Deliverables:
- saved announcement draft support
- basic draft history if implemented

---

## 28. Minimum Viable Product

Announcement Draft Assistant MVP should include:
- authenticated faculty-only access
- new announcement drafting
- rewrite existing announcement
- shorten announcement
- adjust tone
- editable output
- no automatic posting
- backend Gemini integration

This is enough to make the feature useful, practical, and manageable.

---

## 29. Recommended Development Priority

Build in this order:
1. AI config and service
2. announcement prompt builder
3. generate endpoint
4. rewrite endpoint
5. tone-adjust or shorten endpoint
6. frontend drafting page
7. editable output flow
8. optional save draft later

---

## 30. Documentation-Friendly Definition

Announcement Draft Assistant is an AI-assisted faculty feature within HelloUniversity that helps instructors draft, rewrite, and refine academic announcements while requiring manual review before posting.

---

## 31. Development-Friendly Definition

Announcement Draft Assistant is a secured backend-integrated faculty communication drafting module for HelloUniversity. It accepts structured announcement details or raw message text, calls the Gemini API, and returns editable announcement drafts for review and manual posting.

---

## 32. Scope Reminder

Version 1 should focus only on:
- draft
- rewrite
- shorten
- tone adjustment
- review
- manual use

Version 1 should avoid early scope expansion into:
- automatic posting
- scheduling
- student-facing AI communication
- multi-channel delivery automation
- communication analytics
- translation workflows unless explicitly needed

---

## 33. Final Direction

Announcement Draft Assistant should begin as a tightly controlled, faculty-only communication drafting feature inside HelloUniversity.

Its first success metric is not automation.

Its first success metric is whether instructors can prepare clearer announcements faster while still reviewing the final message themselves.
