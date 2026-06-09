# Release Note - 2026-06-10

## Summary

This release refreshes the HelloUniversity authentication experience, improves signup school selection, documents the current legal/footer updates, and includes responsive polish for lesson cards and student dashboard shortcuts.

## Included Changes

- Updated `/login` with a connected two-panel layout:
  - green HelloUniversity intro panel
  - white login form panel
  - shared outer border, radius, and shadow
  - mobile keeps the form first and intro content below
- Updated `/signup` with the same connected panel system:
  - signup form appears first
  - green `Create Account` information panel appears on the right on wide desktop
  - desktop form spacing was compacted to reduce unnecessary vertical scroll
  - signup submit button is right-aligned and reduced to 40% width on desktop while staying full-width on mobile
- Improved signup school search UX:
  - directory-first school picker with a secondary manual-entry fallback
  - clear disabled, searching, results, empty, selected, manual, and error states
  - selected-school confirmation card with a `Change` action
  - stronger result card hierarchy with school name, location, and institution type badge
  - keyboard support for Arrow Up, Arrow Down, Enter, and Escape
  - ARIA combobox/listbox/option behavior added
- Improved desktop school search layout:
  - wide desktop results now open as a right-side popup beside the school field
  - popup starts near Step 2 for more vertical room
  - popup uses a light green-gray tinted surface, border, and shadow so it reads as an overlay
  - narrower desktop, tablet, and mobile keep the in-flow stacked results list
- Improved institution directory search quality:
  - normalized punctuation, whitespace, and casing before matching
  - exact and prefix school-name matches rank above city/region matches
  - default search result limit increased to 10
- Added signup validation highlighting:
  - empty required fields turn red after `Sign Up`
  - invalid state includes border, background, label color, focus ring, checkbox outline, and `aria-invalid`
  - fields clear the red state as users type or select a valid value
  - school search is not marked red while disabled before institution type selection
- Confirmed signup reCAPTCHA behavior:
  - signup page renders reCAPTCHA v3 when CAPTCHA is enabled
  - signup client sends `g-recaptcha-response`
  - signup API verifies the token server-side outside development/CAPTCHA-disabled mode
- Updated legal/footer content:
  - footer copyright year is dynamic
  - legal policy pages were updated to reflect current app features
- Included responsive polish for non-auth surfaces:
  - lesson track card spacing and mobile card structure
  - student dashboard primary shortcut sizing, spacing, and mobile behavior

## Verification

Verified with:

```powershell
npm test -- tests/smoke/authWebRoutes.test.js --runInBand
npm test -- tests/smoke/institutionsDirectory.test.js --runInBand
node --check public/js/auth/signupPage.js
node --check public/js/auth/institutionSearch.js
```

Render checks covered:

- `/signup` at `1366x768`, `1366x900`, `1100x768`, `768x900`, and `390x844`
- empty signup submit validation
- school type selection
- directory search results
- directory result selection
- selected school confirmation
- manual fallback behavior

Result: targeted auth route coverage, institution search ranking coverage, signup client syntax checks, and browser layout checks passed.

## Git

- Branch: `main`
- Remote: `origin` (`https://github.com/4hprojects/hellouniversity.git`)
- Session commit: `c1b53a1 Improve auth signup experience`
