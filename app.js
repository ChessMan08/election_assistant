/**
 * app.js — VoteGuide AI
 * Main application logic:
 *   - Tab switching
 *   - Step card accordion
 *   - AI chat interface
 *   - Auto-resize textarea
 *   - Keyboard accessibility
 */

// ===== STATE =====

/** Stores conversation history so Gemini has context across messages */
const chatHistory = [];

/** Tracks if AI is currently processing a request */
let isLoading = false;

// ===== DOM REFERENCES =====
// Cached once on load for performance

const tabBtns    = document.querySelectorAll(".tab-btn");
const tabPanels  = document.querySelectorAll(".tab-panel");
const stepCards  = document.querySelectorAll(".step-card");
const chatInput  = document.getElementById("chatInput");
const sendBtn    = document.getElementById("sendBtn");
const chatMsgs   = document.getElementById("chatMessages");
const typingInd  = document.getElementById("typingIndicator");
const suggChips  = document.querySelectorAll(".suggestion-chip");

// ===== UTILITIES =====

/**
 * Gets the current time as a formatted string (e.g. "2:34 PM")
 * @returns {string}
 */
function getCurrentTime() {
  return new Date().toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Sanitizes text to prevent XSS when inserting user input into HTML.
 * @param {string} text
 * @returns {string}
 */
function sanitize(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Converts basic markdown-like formatting from Gemini responses into HTML.
 * Handles: **bold**, *italic*, bullet lists, numbered lists, and line breaks.
 * @param {string} text
 * @returns {string}
 */
function formatAIResponse(text) {
  // Escape HTML first to prevent XSS
  let html = sanitize(text);

  // Convert **bold** → <strong>
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Convert *italic* → <em>
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Convert bullet points (lines starting with * or - or •)
  const lines = html.split("\n");
  const result = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (/^[-•*]\s+/.test(line)) {
      if (!inList) {
        result.push("<ul>");
        inList = true;
      }
      result.push(`<li>${line.replace(/^[-•*]\s+/, "")}</li>`);
    } else if (/^\d+\.\s+/.test(line)) {
      if (!inList) {
        result.push("<ol>");
        inList = true;
      }
      result.push(`<li>${line.replace(/^\d+\.\s+/, "")}</li>`);
    } else {
      if (inList) {
        result.push("</ul>");
        inList = false;
      }
      if (line) {
        result.push(`<p>${line}</p>`);
      }
    }
  }

  if (inList) result.push("</ul>");

  return result.join("");
}

/**
 * Scrolls the chat window to the bottom smoothly.
 */
function scrollToBottom() {
  chatMsgs.scrollTo({ top: chatMsgs.scrollHeight, behavior: "smooth" });
}

// ===== TAB SWITCHING =====

/**
 * Activates the selected tab and hides all others.
 * Updates ARIA attributes for accessibility.
 * @param {string} tabName - The data-tab value of the target tab
 */
function switchTab(tabName) {
  tabBtns.forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  tabPanels.forEach((panel) => {
    const isActive = panel.id === `tab-${tabName}`;
    panel.classList.toggle("active", isActive);
    if (isActive) {
      panel.removeAttribute("hidden");
    } else {
      panel.setAttribute("hidden", "");
    }
  });
}

// Attach click listeners to tab buttons
tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));

  // Keyboard support: left/right arrow keys for tab navigation
  btn.addEventListener("keydown", (e) => {
    const tabs = Array.from(tabBtns);
    const idx  = tabs.indexOf(btn);

    if (e.key === "ArrowRight") {
      e.preventDefault();
      tabs[(idx + 1) % tabs.length].focus();
      tabs[(idx + 1) % tabs.length].click();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      tabs[(idx - 1 + tabs.length) % tabs.length].focus();
      tabs[(idx - 1 + tabs.length) % tabs.length].click();
    }
  });
});

// ===== STEP CARD ACCORDION =====

/**
 * Toggles a step card open/closed.
 * @param {HTMLElement} card - The step card element
 */
function toggleStepCard(card) {
  const body   = card.querySelector(".step-body");
  const toggle = card.querySelector(".step-toggle");
  const isOpen = card.classList.contains("open");

  if (isOpen) {
    // Close this card
    card.classList.remove("open");
    card.setAttribute("aria-expanded", "false");
    body.setAttribute("hidden", "");
    toggle.textContent = "+";
  } else {
    // Close all other cards first
    stepCards.forEach((otherCard) => {
      if (otherCard !== card && otherCard.classList.contains("open")) {
        otherCard.classList.remove("open");
        otherCard.setAttribute("aria-expanded", "false");
        otherCard.querySelector(".step-body").setAttribute("hidden", "");
        otherCard.querySelector(".step-toggle").textContent = "+";
      }
    });

    // Open this card
    card.classList.add("open");
    card.setAttribute("aria-expanded", "true");
    body.removeAttribute("hidden");
    toggle.textContent = "−";
  }
}

// Attach listeners to step cards
stepCards.forEach((card) => {
  card.addEventListener("click", () => toggleStepCard(card));

  // Keyboard: Enter or Space to toggle
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleStepCard(card);
    }
  });
});

// ===== CHAT: RENDER MESSAGES =====

/**
 * Renders a message in the chat window.
 * @param {string}  text    - The message text (raw or HTML)
 * @param {"user"|"ai"} role - Who sent the message
 * @param {boolean} isError - Whether this is an error message
 */
function renderMessage(text, role, isError = false) {
  const message = document.createElement("div");
  message.className = `message ${role === "user" ? "user-message" : "ai-message"}`;
  message.setAttribute("role", "article");
  message.setAttribute(
    "aria-label",
    `${role === "user" ? "Your" : "AI"} message`
  );

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = role === "user" ? "👤" : "🤖";

  const content = document.createElement("div");
  content.className = "message-content";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  if (isError) bubble.classList.add("error-bubble");

  // Use formatted HTML for AI messages, sanitized text for user messages
  if (role === "ai" && !isError) {
    bubble.innerHTML = formatAIResponse(text);
  } else if (isError) {
    bubble.innerHTML = `<p>⚠️ ${sanitize(text)}</p>`;
  } else {
    const p = document.createElement("p");
    p.textContent = text;
    bubble.appendChild(p);
  }

  const time = document.createElement("div");
  time.className = "message-time";
  time.setAttribute("aria-label", `Sent at ${getCurrentTime()}`);
  time.textContent = getCurrentTime();

  content.appendChild(bubble);
  content.appendChild(time);

  message.appendChild(avatar);
  message.appendChild(content);

  chatMsgs.appendChild(message);
  scrollToBottom();
}

// ===== CHAT: SEND MESSAGE =====

/**
 * Shows or hides the typing indicator.
 * @param {boolean} show
 */
function setTypingIndicator(show) {
  if (show) {
    typingInd.removeAttribute("hidden");
    scrollToBottom();
  } else {
    typingInd.setAttribute("hidden", "");
  }
}

/**
 * Enables or disables the input controls while the AI is responding.
 * @param {boolean} disabled
 */
function setInputDisabled(disabled) {
  chatInput.disabled = disabled;
  sendBtn.disabled   = disabled;
  isLoading          = disabled;
}

/**
 * Core function: takes the user's message, sends to Gemini, renders the reply.
 * Handles loading state, error display, and chat history tracking.
 * @param {string} messageText
 */
async function sendMessage(messageText) {
  const text = messageText.trim();
  if (!text || isLoading) return;

  // Render the user's message
  renderMessage(text, "user");

  // Add to history
  chatHistory.push({ role: "user", text });

  // Clear the input and disable while loading
  chatInput.value = "";
  autoResizeTextarea();
  setInputDisabled(true);
  setTypingIndicator(true);

  try {
    // Call the Gemini API
    const reply = await askGemini(text, chatHistory);

    // Hide indicator and render the reply
    setTypingIndicator(false);
    renderMessage(reply, "ai");

    // Add AI reply to history for context
    chatHistory.push({ role: "model", text: reply });

    // Keep history manageable (max 20 messages)
    if (chatHistory.length > 20) {
      chatHistory.splice(0, 2);
    }
  } catch (err) {
    setTypingIndicator(false);
    console.error("Gemini API Error:", err);

    // Show user-friendly error
    renderMessage(
      err.message || "Something went wrong. Please try again.",
      "ai",
      true
    );
  } finally {
    setInputDisabled(false);
    chatInput.focus();
  }
}

// ===== CHAT: INPUT EVENTS =====

// Send button click
sendBtn.addEventListener("click", () => {
  sendMessage(chatInput.value);
});

// Send on Enter key (Shift+Enter = new line)
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage(chatInput.value);
  }
});

/**
 * Auto-resizes the textarea height based on its content.
 */
function autoResizeTextarea() {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
}

chatInput.addEventListener("input", autoResizeTextarea);

// ===== SUGGESTION CHIPS =====

suggChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    const question = chip.dataset.question;
    if (question && !isLoading) {
      // Switch to AI tab if not already on it
      switchTab("ai");
      sendMessage(question);
    }
  });
});

// ===== INIT =====

/**
 * Runs on page load to verify the config and welcome the user.
 */
function init() {
  // Check if config.js provided the key
  if (
    typeof GEMINI_API_KEY === "undefined" ||
    GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE" ||
    !GEMINI_API_KEY
  ) {
    // Warn the developer in the console — won't break the UI
    console.warn(
      "[VoteGuide AI] ⚠️ Gemini API key not found.\n" +
      "Copy config.example.js → config.js and add your API key.\n" +
      "Get your key at: https://aistudio.google.com"
    );
  }

  // Focus the first tab on load
  tabBtns[0]?.focus();
}

// Run init when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}