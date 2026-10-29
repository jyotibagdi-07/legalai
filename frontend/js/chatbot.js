async function sendMessage() {
  const inputField = document.getElementById("userInput");
  const messagesDiv = document.getElementById("chatMessages");
  const userMessage = inputField.value.trim();

  if (!userMessage) return;

  addMessage("user", userMessage);
  inputField.value = "";

  const typingId = addTypingIndicator();

  try {
    const stored = sessionStorage.getItem("analysisResult") || "";
    const data = await legalAiChat(userMessage, stored);
    removeTypingIndicator(typingId);
    addMessage("ai", data.reply || "No reply from the server.");
  } catch (error) {
    console.warn("Chat backend error:", error);
    removeTypingIndicator(typingId);
    addMessage(
      "ai",
      "Could not reach the LegalAI backend. Start it with `python main.py` and open http://127.0.0.1:8016/"
    );
  }

  messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function addMessage(sender, text) {
  const messagesDiv = document.getElementById("chatMessages");
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

function speakText(text) {
  if ("speechSynthesis" in window) {
    const cleanText = text.replace(/\*\*|#|_/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

document.getElementById("userInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") sendMessage();
});

function formatMarkdown(str) {
  return escapeHtml(str)
    .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
    .replace(/(?:^|\n)(?:-|\*) (.*)/g, "<br>• $1")
    .replace(/\n/g, "<br>");
}

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
