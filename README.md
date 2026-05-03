# 🗳️ VoteGuide AI - Interactive Election Process Assistant

> An AI-powered web app that helps every Indian citizen understand the election
> process, their voting rights, and how democracy works - in a simple, interactive,
`> and multilingual way.
`
**Built for:** PromptWars Virtual Challenge #2 by H2S × Google for Developers  
**Live Demo:** [https://challenge2-c3d8c.web.app/](https://challenge2-c3d8c.web.app/)  
**Tech Stack:** HTML · CSS · JavaScript · Google Gemini API · Firebase Hosting · Google Translate

---

## 🎯 Chosen Vertical

**Election Education & Civic Awareness Assistant**

India has one of the world's largest electorates (970+ million voters), yet many
first-time voters are unsure how to register, where to vote, or what happens after
polling day. VoteGuide AI bridges this information gap with a friendly, interactive,
and accessible experience.

---

## ✨ Features

| Feature | Description |
|---|---|
| 📋 How Elections Work | 6 interactive accordion cards - tap to expand each step with detailed explanations and practical tips |
| 🗓️ Visual Timeline | A complete end-to-end election timeline from announcement to government formation |
| 🤖 AI Chatbot | Gemini-powered assistant for any election question - with multi-turn conversation context |
| 💬 Quick Suggestions | One-tap questions to get users started instantly |
| 🌐 Multilingual | Google Translate widget supports 10 Indian languages (Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam, Punjabi) |
| ♿ Accessible | ARIA labels, keyboard navigation, focus management, reduced-motion support, high-contrast mode |
| 📱 Responsive | Fully optimized for mobile, tablet, and desktop |

---

## 💡 Approach & Logic

### Problem
Most election information in India is either too formal (government PDFs) or too
fragmented (social media posts). First-time voters especially lack a single,
trustworthy, easy-to-understand guide.

### Solution Architecture

```
User
  │
  ├─► Static Web App (HTML/CSS/JS)
  │     ├─ Tab 1: How Elections Work (accordion steps)
  │     ├─ Tab 2: Visual Election Timeline
  │     └─ Tab 3: AI Chat Interface
  │
  ├─► Google Gemini 1.5 Flash API
  │     └─ Answers election questions with a custom system prompt
  │        that keeps the AI unbiased and election-focused
  │
  ├─► Google Translate API
  │     └─ Makes all content accessible in 10 Indian languages
  │
  └─► Firebase Hosting
        └─ Fast, free, reliable static hosting with a CDN
```

### AI Design Decisions
- **System Prompt Engineering:** Gemini is given a detailed persona as an unbiased,
  election-focused assistant. It refuses to answer off-topic questions and
  directs users to official ECI sources when uncertain.
- **Conversation History:** The last 6 message pairs are sent with each request,
  giving the AI context for follow-up questions.
- **Safety Settings:** All four Gemini safety categories are set to
  `BLOCK_MEDIUM_AND_ABOVE` for responsible content.
- **Response Formatting:** A custom `formatAIResponse()` function converts Gemini's
  markdown-style output into clean HTML for display.

---

## ⚙️ How the Solution Works

### File Structure
```
election-assistant/
├── index.html          # Single-page app - all UI structure
├── style.css           # Complete styling with CSS variables & animations
├── app.js              # Tab switching, accordion, chat UI logic
├── gemini.js           # Gemini API integration with error handling
├── config.js           # Your API key
├── .gitignore          # Protects secrets and build artifacts
└── README.md           
```

### How a Chat Message Flows
1. User types a question and presses Send (or Enter)
2. `app.js` validates the input and calls `sendMessage()`
3. The user's message is rendered and added to `chatHistory[]`
4. `gemini.js`'s `askGemini()` is called with the message + recent history
5. The Gemini 1.5 Flash API returns a response
6. `formatAIResponse()` converts the markdown-like text to HTML
7. The response is rendered in the chat and added to history

---

## 🔧 Google Services Used

| Service | How Used |
|---|---|
| **Google Gemini 2.0 Flash** | Powers the AI chatbot - answers user questions about elections with a custom system prompt for unbiased, accurate responses |
| **Firebase Hosting** | Hosts the static web app with global CDN, free SSL, and a `.web.app` domain |
| **Google Translate API** | Widget in the header enables one-click translation of all page content into 10 Indian languages |

---

## ✅ Testing

| Test Case | Input | Expected Result | Status |
|---|---|---|---|
| Voter registration query | "How do I register to vote?" | Step-by-step guide with Form 6 and NVSP link | ✅ |
| Polling booth process | "What happens at the polling booth?" | EVM, VVPAT, indelible ink explained | ✅ |
| NOTA question | "What is NOTA?" | Clear explanation of the option | ✅ |
| Off-topic question | "What is the capital of France?" | Politely redirected to election topics | ✅ |
| Empty input | Press Send with no text | No API call made, no error shown | ✅ |
| Suggestion chip | Click "How does EVM work?" | Sends question directly to AI | ✅ |
| Tab switching | Click each tab | Correct panel shows, ARIA updated | ✅ |
| Step accordion | Click a step card | Expands with details, others close | ✅ |
| Language switch | Select Hindi in Translate | Full page translates | ✅ |
| Mobile view | Screen width < 768px | Responsive layout, all features work | ✅ |
| Invalid API key | Wrong key in config.js | User-friendly error message shown | ✅ |
| Rate limit hit | Rapid repeated sends | Graceful error message displayed | ✅ |

---

## 📌 Assumptions Made

- Election content is focused on **Indian general elections (Lok Sabha)** and
  state assembly elections, as these are most relevant to the target audience.
- The API key is stored in a gitignored `config.js` file. In a production
  deployment, it would be secured behind a Firebase Cloud Function server proxy.
- Users have basic internet connectivity and a modern browser (Chrome, Firefox,
  Safari, Edge — all supported).
- The Google Translate widget is used for language accessibility rather than a
  fully custom multilingual implementation, as it covers all 22 scheduled
  Indian languages efficiently.

---

## 🚀 Running Locally

```bash
# 1. Clone the repository
git clone https://github.com/ChessMan08/election_assistant.git
cd election-assistant

# 2. Set up your API key
cp config.js
# Open config.js and replace YOUR_GEMINI_API_KEY_HERE with your actual key
# Get a free key at: https://aistudio.google.com

# 3. Open in browser
# Simply open index.html in your browser, OR use a local server:
npx serve .
# Then visit http://localhost:3000
```

---

## 🌐 Deployment (Firebase Hosting)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # public dir: .   |  single-page: Yes  |  overwrite index.html: No
firebase deploy
```

---

## 📬 Contact & Links

- **GitHub Repository:** [https://github.com/ChessMan08/election_assistant](https://github.com/ChessMan08/election_assistant)
- **Live Demo:** [https://challenge2-c3d8c.web.app](https://challenge2-c3d8c.web.app)
- **Official ECI:** [voters.eci.gov.in](https://voters.eci.gov.in)
- **Voter Helpline:** 1950

---

*Built using Google Antigravity, Gemini AI, and Firebase - for PromptWars Challenge #2*
