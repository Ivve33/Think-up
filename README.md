# Think-Up

> An AI-powered collaborative study platform built for Saudi university students.

Think-Up helps students discover shared courses across different majors, join structured study sessions, conduct live recorded meetings, and receive AI-generated session summaries. The platform's differentiating mechanic is **cross-major collaboration** — students from different programs (e.g., Software Engineering and AI) who share a course can join the same study session together.

---

## 📚 Course Information

- **Course:** CCSW321 — Web Development
- **University:** University of Jeddah — College of Computer Science & Engineering
- **Department:** Software Engineering
- **Academic Session:** 2025–2026

---

## 👥 Team Members

| Name | ID | Role |
|---|---|---|
| Osama Alghamdi | 2340546 | Full-Stack Developer |
| Abdullah Alahmadi | 2340221 | Full-Stack Developer |
| Abdullah AlMazroui | 2340644 | AI & Backend Integration |

---

## ✨ Features

- 🌐 **Bilingual interface** — Full Arabic and English support with RTL layout
- 🏛️ **University & major explorer** — Browse the College of CS&E with all 6 majors
- 📖 **Course catalog** — 278 unique courses across 329 curriculum references
- 🤝 **Cross-major study sessions** — Join sessions with students from other majors who share your course
- 🎥 **Live video sessions** — Powered by Daily.co with built-in recording
- 🤖 **AI-generated summaries** — Automatic transcription and structured notes after each session
- 🔐 **Authentication** — Secure sign-up and sign-in with Firebase Auth
- 📱 **Responsive design** — Works on mobile, tablet, and desktop (576px / 768px / 992px breakpoints)

---

## 🛠️ Technology Stack

### Frontend
- **HTML5** — Semantic structure (`<header>`, `<nav>`, `<section>`, `<aside>`, `<footer>`)
- **CSS3** — Custom styling with responsive media queries
- **Vanilla JavaScript (ES6 Modules)** — No frameworks

### Backend
- **Firebase Authentication** — User sign-up, sign-in, session management
- **Cloud Firestore** — NoSQL database for users, sessions, courses, contact messages
- **Firebase Cloud Functions (Node.js 22)** — Server-side validation, video room management, AI integration
- **Daily.co API** — Live video meetings with recording and transcription
- **Anthropic Claude API** — AI-generated session summaries

---

## 📁 Folder Structure

```
Think-up/
├── HTML/                     # All HTML pages (EN + AR versions)
├── CSS/                      # Stylesheets per page
├── JS/                       # Frontend JavaScript modules
├── Media/                    # Images and assets
├── Backend/                  # Firebase Cloud Functions
│   ├── index.js              # Daily.co room/token/end handlers
│   ├── contact.js            # Contact form validation & storage
│   └── package.json
├── Core/
│   └── firebase.js           # Firebase client configuration
├── firebase.json             # Firebase project configuration
└── README.md                 # This file
```

---

## 📄 Pages Overview

| Page | Purpose |
|---|---|
| `homePage.html` | Welcome page introducing the platform |
| `about.html` | Team information and project mission |
| `contact.html` | Contact form with full validation pipeline |
| `auth.html` | Sign-up and sign-in |
| `dashboard.html` | Personal user dashboard |
| `explore.html` | Browse universities |
| `university-details.html` | College and majors overview |
| `major-details.html` | Major-specific course curriculum |
| `course-details.html` | Course information and active sessions |
| `course-sessions.html` | All study sessions for a course |
| `create-session.html` | Form to schedule a new study session |
| `join-session.html` | Join an existing session via invite |
| `session-room.html` | Live video meeting room with recording |
| `session-summary.html` | AI-generated summary after a session ends |
| `session-history.html` | Past sessions and their recordings |

Each page has a parallel Arabic version (e.g., `homePage-ar.html`) with full RTL support.

---

## 🔒 Validation Pipeline

User input goes through **two independent validation layers**, as required by the project specification:

### 1. Frontend Validation (HTML + JavaScript)
- HTML5 attributes: `required`, `pattern`, `maxlength`, `type="email"`, `type="tel"`, `type="date"`
- JavaScript checks for entry, type, length, and format before submission
- Real-time user feedback messages

### 2. Backend Validation (Cloud Functions)
- Receives data via HTTPS callable function
- **Sanitizes** all input — strips HTML tags, blocks `javascript:` URIs, removes inline event handlers
- **Re-validates** entry, type, length, and format on the server
- Whitelist enforcement for select fields (gender, language, subject)
- Writes to Firestore with admin privileges only after passing all checks
- Returns descriptive error messages to the client

This ensures that even if a user bypasses the frontend (via browser DevTools or direct API calls), the server will reject malformed or malicious data.

---

## 🗄️ Database Schema

### Firestore Collections

```
universities/{uniId}
└── courses/{courseId}            # Single source of truth for all courses
    └── availableFor: [majorIds]  # Cross-major linkage

universities/{uniId}/majors/{majorId}
└── curriculum/{courseRef}        # Per-major curriculum (level, type, prereqs)

users/{userId}                    # Profile, major, university

sessions/{sessionId}              # Linked by courseId (never majorId)
└── participants, hostId, dailyRoomUrl, transcript, recordingUrl

contactMessages/{messageId}       # Submissions from contact form
```

---

## 🚀 Setup & Running

### Prerequisites
- Node.js 22+
- Firebase CLI: `npm install -g firebase-tools`
- A Firebase project with Authentication, Firestore, and Cloud Functions enabled

### Installation

```bash
# 1. Clone or extract the project
cd Think-up

# 2. Install backend dependencies
cd Backend
npm install
cd ..

# 3. Log in to Firebase
firebase login

# 4. Deploy Cloud Functions
firebase deploy --only functions
```

### Running Locally

The frontend is static HTML/CSS/JS — open any `HTML/*.html` file directly in a browser, or serve the project root with any static server (e.g., VS Code Live Server).

---

## 🌐 HTML Validation

All HTML pages have been validated against the W3C Markup Validator at:  
**https://validator.w3.org/**

Validation screenshots are included in the submission PDF.

---

## 📐 Responsive Design

The site adapts to three primary breakpoints:

| Breakpoint | Target Device |
|---|---|
| ≤ 576px | Mobile portrait |
| ≤ 768px | Tablet portrait |
| ≤ 992px | Tablet landscape / small laptop |

Layouts gracefully shift from multi-column grids to single-column stacks, navigation collapses, and touch targets enlarge for mobile interaction.

---

## ♿ Accessibility

- Semantic HTML5 tags throughout (`<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`)
- `alt` attributes on all images
- `aria-label` on icon-only interactive elements
- Logical heading hierarchy (single `<h1>` per page, descending order)
- Keyboard navigable forms with proper `<label>` associations
- Sufficient color contrast for text and interactive elements

---

## 📝 Project Requirements Coverage

| Requirement | Status |
|---|---|
| HTML5 semantic structure | ✅ |
| Separated CSS files | ✅ |
| Separated JavaScript files | ✅ |
| Organized folder structure | ✅ |
| Minimum 4 pages | ✅ (15 pages) |
| Index / Welcome page | ✅ |
| About-us page | ✅ |
| Contact-us form with all required fields | ✅ |
| Main idea page with form | ✅ |
| 4+ different input types in forms | ✅ |
| Frontend validation (HTML + JS) | ✅ |
| Backend validation with sanitization | ✅ |
| Database integration | ✅ |
| Responsive design (576/768/992) | ✅ |
| HTML validator passed | ✅ |
| Accessibility best practices | ✅ |

---

## 📜 License

This project was developed as an academic submission for **CCSW321 — Web Development** at the **University of Jeddah** (Academic Year 2025–2026). All code is the original work of the team members listed above.

---

## 📬 Contact

For questions about this project, please reach out via the contact form on the deployed site or directly through the team members' LinkedIn profiles listed on the About page.

---

**Built with care for Saudi students. 🇸🇦**
