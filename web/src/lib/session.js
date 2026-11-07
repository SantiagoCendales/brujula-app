const TOKEN_KEY = 'brujula.token';

// localStorage can throw (private mode, blocked storage). The in-memory copy keeps the session
// working for the current page; it just will not survive a reload in that case.
let memoryToken = null;

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? memoryToken;
  } catch {
    return memoryToken;
  }
}

export function saveToken(token) {
  memoryToken = token;
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage unavailable: the in-memory copy is enough for this page.
  }
}

export function clearToken() {
  memoryToken = null;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage unavailable: nothing persisted to remove.
  }
}
