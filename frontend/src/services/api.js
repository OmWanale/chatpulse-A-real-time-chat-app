const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", body, token } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  let data = null;

  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const message = data?.message || data?.error || "Request failed";
    throw new Error(message);
  }

  return data;
}

export function registerRequest(payload) {
  return request("/auth/register", {
    method: "POST",
    body: payload
  });
}

export function loginRequest(payload) {
  return request("/auth/login", {
    method: "POST",
    body: payload
  });
}

export function fetchChats(token) {
  return request("/chat", { token });
}

export function accessChat(token, userId) {
  return request("/chat", {
    method: "POST",
    token,
    body: { userId }
  });
}

export function searchUsers(token, query) {
  const encoded = encodeURIComponent(query || "");
  return request(`/user?search=${encoded}`, { token });
}

export function createGroupChat(token, payload) {
  return request("/chat/group", {
    method: "POST",
    token,
    body: payload
  });
}

export function renameGroupChat(token, payload) {
  return request("/chat/rename", {
    method: "PUT",
    token,
    body: payload
  });
}

export function addToGroup(token, payload) {
  return request("/chat/groupadd", {
    method: "PUT",
    token,
    body: payload
  });
}

export function removeFromGroup(token, payload) {
  return request("/chat/groupremove", {
    method: "PUT",
    token,
    body: payload
  });
}

export function fetchMessages(token, chatId) {
  return request(`/message/${chatId}`, { token });
}

export function sendMessageRequest(token, payload) {
  return request("/message", {
    method: "POST",
    token,
    body: payload
  });
}

export function sendAiMessageRequest(token, payload) {
  return request("/ai", {
    method: "POST",
    token,
    body: payload
  });
}

export function accessAiChat(token) {
  return request("/ai/chat", { token });
}

