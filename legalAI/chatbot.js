async function sendMessage() {
  const inputField = document.getElementById("userInput");
  const messagesDiv = document.getElementById("chatMessages");
  const userMessage = inputField.value.trim();

  if (!userMessage) return;

  addMessage("user", userMessage);
  inputField.value = "";

  // Show typing indicator
  const typingId = addTypingIndicator();

  // Simple fetch without try/catch
  const response = await fetch("http://127.0.0.1:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage })
  });

  // Remove typing indicator regardless of success/fail
  removeTypingIndicator(typingId);

  if (response.ok) {
    const data = await response.json();
    if (data.reply) {
      addMessage("ai", data.reply);
      speakText(data.reply); // voice output
    }
  }
  
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addMessage(sender, text) {
  const messagesDiv = document.getElementById("chatMessages");
  if (sender === "ai") {
    messagesDiv.innerHTML += `
      <div class="message ai">
        <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="AI">
        <div class="bubble">${escapeHtml(text)}</div>
      </div>`;
  } else {
    messagesDiv.innerHTML += `
      <div class="message user">
        <div class="bubble">${escapeHtml(text)}</div>
      </div>`;
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addTypingIndicator() {
  const messagesDiv = document.getElementById("chatMessages");
  const id = "typing-" + Date.now();
  messagesDiv.innerHTML += `
    <div class="message ai" id="${id}">
      <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="AI">
      <div class="bubble"><i>Typing...</i></div>
    </div>`;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return id;
}

async function sendMessage() {
  const inputField = document.getElementById("userInput");
  const messagesDiv = document.getElementById("chatMessages");
  const userMessage = inputField.value.trim();

  if (!userMessage) return;

  addMessage("user", userMessage);
  inputField.value = "";

  // Show typing indicator
  const typingId = addTypingIndicator();

  // Simple fetch without try/catch
  const response = await fetch("http://127.0.0.1:3000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: userMessage })
  });

  removeTypingIndicator(typingId);

  if (response.ok) {
    const data = await response.json();
    if (data.reply) {
      addMessage("ai", data.reply);
      speakText(data.reply); // voice output
    }
  }

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addMessage(sender, text) {
  const messagesDiv = document.getElementById("chatMessages");

  // Convert markdown to HTML for AI messages
  const formattedText = sender === "ai" ? formatMarkdown(text) : escapeHtml(text);

  if (sender === "ai") {
    messagesDiv.innerHTML += `
      <div class="message ai">
        <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="AI">
        <div class="bubble ai-bubble">${formattedText}</div>
      </div>`;
  } else {
    messagesDiv.innerHTML += `
      <div class="message user">
        <div class="bubble user-bubble">${formattedText}</div>
      </div>`;
  }
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addTypingIndicator() {
  const messagesDiv = document.getElementById("chatMessages");
  const id = "typing-" + Date.now();
  messagesDiv.innerHTML += `
    <div class="message ai" id="${id}">
      <img src="https://cdn-icons-png.flaticon.com/512/4712/4712035.png" alt="AI">
      <div class="bubble ai-bubble"><i>Typing...</i></div>
    </div>`;
  messagesDiv.scrollTop = messagesDiv.scrollHeight;
  return id;
}

function removeTypingIndicator(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function sendQuick(text) {
  document.getElementById("userInput").value = text;
  sendMessage();
}

function clearChat() {
  document.getElementById("chatMessages").innerHTML = "";
}

document.getElementById("userInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") sendMessage();
});

// --- Markdown Formatter ---
// Supports: **bold**, newlines, and bullet points (- or * at line start)
function formatMarkdown(str) {
  return escapeHtml(str)
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>") // Bold text
    .replace(/(?:^|\n)(?:-|\*) (.*)/g, "<br>• $1") // Bullet points
    .replace(/\n/g, "<br>"); // Normal newlines
}

// Escape unsafe characters to prevent XSS
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function (tag) {
    const chars = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    };
    return chars[tag] || tag;
  });
}
