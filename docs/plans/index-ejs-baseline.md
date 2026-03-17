# Index Baseline and Dependency Matrix
Date: 2026-02-27

## Baseline Sections (Current Home Page)
- Sticky header with desktop and mobile nav
- Hero section with primary and secondary CTA
- Features cards section
- Platform highlights tab section (Learning / Events / Tools)
- Stats section
- Testimonials section
- CTA section
- Latest blog section (dynamic)
- Random blogs section (dynamic)
- Floating search overlay
- Scroll-to-top button
- Footer (loaded dynamically)

## Critical DOM IDs and Their Script Dependencies

| DOM ID | Used By | Purpose |
|---|---|---|
| `signinLink` | `public/js/checkSession.js` | Swap Sign In -> Dashboard for authenticated users |
| `mobileSigninLink` | `public/js/checkSession.js` | Same as above for mobile nav |
| `latestBlogContainer` | `public/js/blogs.js` | Inject latest blog card |
| `randomBlogsContainer` | `public/js/blogs.js` | Inject random blog cards |
| `scrollToTopBtn` | `public/js/uscripts.js` | Scroll-to-top behavior |
| `searchOverlay` | `public/js/uscripts.js` | Overlay show/hide |
| `overlaySearchInput` | `public/js/uscripts.js` | Search input for redirect |
| `mobileMenuBtn` | `public/js/indexPage.js` | Toggle mobile nav |
| `mobileNav` | `public/js/indexPage.js` | Mobile nav container |

## Class/Selector Dependencies

| Selector | Used By | Purpose |
|---|---|---|
| `.tab-btn` | `public/js/indexPage.js` | Highlights selected tab |
| `.tab-content` | `public/js/indexPage.js` | Shows active tab content |

## Script Dependencies (Current)
- `public/js/uscripts.js` (global utility: footer loader, scroll-to-top, search overlay helpers)
- `public/js/blogs.js` (injects latest/random blog content)
- `public/js/checkSession.js` (auth session check and nav update)
- `public/js/indexPage.js` (mobile nav + tab switching)
- `public/js/ads.js` (ads-related behavior)

## Asset Dependencies
- Google Fonts (`Poppins`)
- Material Icons
- Tailwind CDN
- Flowbite CDN
- Styles: `public/css/ustyles.css`

## Route/Server Constraints
- `server.js` has generic catch-all routes (`app.get('/*', ...)`) that can shadow a future EJS `/` route if order is wrong.
- `server.js` currently serves static from `/public` and has duplicate static middleware lines.

## Rebrand Considerations for Home Migration
- Update canonical and hardcoded domain references during EJS cutover phase.
- Keep visual/copy changes separate from rendering migration to reduce risk.
