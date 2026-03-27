# Release Note - 2026-03-26

## Summary

This release updates both product behavior and public-facing messaging across HelloUniversity.

## Included Changes

- Quiz builder publishing is more flexible:
  - quizzes can be created without assigning a class immediately
  - short-answer and paragraph questions can keep accepted answers blank for manual review
  - checkbox questions now allow a single valid option and a single correct answer
  - the builder step chips now navigate to quiz info, questions, and review inside the editor
  - teacher preview now uses a structured review summary, preview-only callout, and section jump list
  - published teacher quiz surfaces can copy the canonical student responder link
  - student activity links now point to `/quizzes/:quizId/respond`
- Public branding is now consistently aligned with the broader product scope:
  - HelloUniversity is described as a digital academic platform for school and higher education workflows
  - `/about`, homepage, auth pages, footer, and metadata now use the same positioning
- Public FAQ content was refreshed:
  - homepage and `/help` now use HelloUniversity-specific FAQ sets from `app/faqContent.js`
  - FAQ copy is more SEO-friendly and avoids exposing internal implementation details
  - homepage and `/help` publish `FAQPage` structured data
- `/about` now follows the canonical five-pillar model:
  - Academic Management
  - Learning Management
  - Communication and Engagement
  - Grading and Student Academic Access
  - Monitoring and Intelligent Support

## Verification

Verified with:

```powershell
npx jest tests/smoke/teacherQuizBuilderApi.test.js tests/smoke/teacherQuizBuilderClient.test.js tests/smoke/teacherQuizBuilderShortAnswerClient.test.js tests/smoke/teacherQuizPages.test.js tests/smoke/teacherQuizDashboardClient.test.js tests/smoke/studentQuizRespondPage.test.js tests/smoke/studentClassesApi.test.js --runInBand
```

Result: 75 tests passed across 7 suites.

## Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
