function legalAiApiBase() {
  if (window.location.port === "8016") return "";
  return "http://127.0.0.1:8016";
}

async function legalAiAnalyzeFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch(legalAiApiBase() + "/analyze", {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    let detail = "HTTP " + response.status;
    try {
      const err = await response.json();
      detail = err.detail || err.message || detail;
    } catch (_) {
      /* ignore */
    }
    throw new Error(detail);
  }
  return response.json();
}

async function legalAiChat(message, context) {
  const response = await fetch(legalAiApiBase() + "/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: message,
      context: context || "",
    }),
  });
  if (!response.ok) {
    throw new Error("Chat HTTP " + response.status);
  }
  return response.json();
}
