/**
 * gemini.js — VoteGuide AI
 * Handles all communication with the Google Gemini 1.5 Flash API.
 *
 * SECURITY NOTE:
 * The API key is stored in config.js (which is gitignored).
 * In a production environment, API calls should be proxied
 * through a backend server (e.g., Firebase Cloud Functions)
 * so the key is never exposed to the browser.
 */

// ===== CONSTANTS =====

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

/**
 * System instruction that shapes VoteGuide AI's personality
 * and keeps it strictly focused on elections.
 */
const SYSTEM_INSTRUCTION = `
You are VoteGuide AI, a friendly, knowledgeable, and unbiased assistant that
helps Indian citizens understand the election process, their voting rights,
and how democracy works.

YOUR PERSONALITY:
- Warm, approachable, and encouraging — never condescending
- Clear and jargon-free — imagine explaining to a first-time voter
- Unbiased and politically neutral — you NEVER support or criticize any party,
  candidate, or political ideology

YOUR EXPERTISE:
- Indian general elections (Lok Sabha) and state assembly elections
- Voter registration process (NVSP, Form 6, Voter ID / EPIC)
- Election Commission of India (ECI) rules and procedures
- Model Code of Conduct (MCC)
- Electronic Voting Machines (EVM) and VVPAT
- Polling booth procedures and voter rights
- Candidate nomination and withdrawal process
- Vote counting and result declaration
- NOTA (None of The Above)
- First Past The Post electoral system

YOUR RESPONSE STYLE:
- Keep answers concise and easy to understand (3–6 sentences for simple questions)
- Use bullet points or numbered lists when explaining multi-step processes
- Use relevant emojis sparingly to make responses friendlier (e.g., 🗳️ 📝 ✅)
- Always end with a helpful follow-up suggestion if relevant
- If asked about a specific state's election, provide relevant state-specific info

IMPORTANT RULES:
- If asked anything NOT related to elections, voting, or civic participation,
  politely say: "I'm specialized in election and voting topics! For that question,
  I'd suggest doing a web search. Is there anything about elections I can help you with? 🗳️"
- Never make up dates, laws, or statistics — if unsure, say so and direct the
  user to voters.eci.gov.in or the Voter Helpline (1950)
- Never express political opinions or endorse any political party or candidate
`;

// ===== MAIN FUNCTION =====

/**
 * Sends a user message to the Gemini API and returns the AI's response.
 *
 * @param {string} userMessage - The question typed by the user
 * @param {Array}  chatHistory  - Previous messages for context (optional)
 * @returns {Promise<string>}    - The AI's response text
 * @throws {Error}               - On network failure or API error
 */
async function askGemini(userMessage, chatHistory = []) {
  // Validate API key exists
  if (
    typeof GEMINI_API_KEY === "undefined" ||
    !GEMINI_API_KEY ||
    GEMINI_API_KEY === "YOUR_GEMINI_API_KEY_HERE"
  ) {
    throw new Error(
      "API key not configured. Please add your Gemini API key to config.js"
    );
  }

  // Validate the message is not empty
  const trimmed = userMessage.trim();
  if (!trimmed) {
    throw new Error("Message cannot be empty.");
  }

  // Build the conversation history for the API
  // We include recent history so the AI has context
  const recentHistory = chatHistory.slice(-6); // Last 6 messages for context window efficiency
  const formattedHistory = recentHistory.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  // Add the current user message
  formattedHistory.push({
    role: "user",
    parts: [{ text: trimmed }],
  });

  // Build the request body
  const requestBody = {
    system_instruction: {
      parts: [{ text: SYSTEM_INSTRUCTION }],
    },
    contents: formattedHistory,
    generationConfig: {
      temperature: 0.7,        // Balanced creativity and accuracy
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 800,    // ~600 words max — keeps responses focused
      stopSequences: [],
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT",        threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_HATE_SPEECH",       threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
    ],
  };

  // Make the API request
  const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  // Handle HTTP errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData?.error?.message || `HTTP ${response.status}`;

    if (response.status === 400) {
      throw new Error(`Invalid request: ${errorMessage}`);
    } else if (response.status === 403 || response.status === 401) {
      throw new Error(
        "Invalid API key. Please check your Gemini API key in config.js"
      );
    } else if (response.status === 429) {
      throw new Error(
        "Rate limit reached. Please wait a moment and try again."
      );
    } else if (response.status >= 500) {
      throw new Error(
        "Gemini API is temporarily unavailable. Please try again shortly."
      );
    } else {
      throw new Error(`API error: ${errorMessage}`);
    }
  }

  // Parse the response
  const data = await response.json();

  // Check for safety blocks
  if (data.candidates?.[0]?.finishReason === "SAFETY") {
    throw new Error(
      "Your message was flagged by safety filters. Please rephrase your question."
    );
  }

  // Extract the response text
  const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!responseText) {
    throw new Error(
      "Received an empty response from the AI. Please try again."
    );
  }

  return responseText;
}