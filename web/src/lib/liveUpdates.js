import { useEffect, useSyncExternalStore } from 'react';
import { apiUrl, authHeaders, reportUnauthorized } from './api.js';

// One Server-Sent Events stream per session (GET /api/events). EventSource cannot send the Authorization
// header, so the stream is read with fetch. Screens subscribe with useActivityChanges(reload).

const RETRY_MIN_MS = 1_000;
const RETRY_MAX_MS = 15_000;

const changeListeners = new Set();
const statusListeners = new Set();
let status = 'offline';

function setStatus(next) {
  status = next;
  for (const listener of statusListeners) listener();
}

function dispatch(message) {
  const lines = message.split('\n');
  const eventName = lines.find((line) => line.startsWith('event: '))?.slice(7);
  const data = lines.find((line) => line.startsWith('data: '))?.slice(6);
  if (eventName !== 'activity.changed' || !data) return;
  const event = JSON.parse(data);
  for (const listener of changeListeners) listener(event);
}

async function readStream(signal) {
  const response = await fetch(apiUrl('/api/events'), { headers: authHeaders(), signal });
  if (response.status === 401) {
    reportUnauthorized();
    return 'stop';
  }
  if (!response.ok || !response.body) throw new Error(`Live updates unavailable (HTTP ${response.status})`);

  setStatus('live');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) return 'retry';
    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split('\n\n');
    buffer = messages.pop();
    messages.forEach(dispatch);
  }
}

// Starts the stream and keeps it alive (reconnecting with backoff). Returns a function that stops it.
export function startLiveUpdates() {
  const controller = new AbortController();
  let retryMs = RETRY_MIN_MS;

  async function run() {
    while (!controller.signal.aborted) {
      try {
        if ((await readStream(controller.signal)) === 'stop') break;
        retryMs = RETRY_MIN_MS;
      } catch {
        if (controller.signal.aborted) break;
      }
      setStatus('reconnecting');
      await new Promise((resolve) => setTimeout(resolve, retryMs));
      retryMs = Math.min(retryMs * 2, RETRY_MAX_MS);
    }
    setStatus('offline');
  }

  run();
  return () => controller.abort();
}

// Calls `onChange(event)` whenever an activity the user can see changes. Pass a stable function (e.g. useApi's reload).
export function useActivityChanges(onChange) {
  useEffect(() => {
    changeListeners.add(onChange);
    return () => changeListeners.delete(onChange);
  }, [onChange]);
}

export function useLiveStatus() {
  return useSyncExternalStore(
    (listener) => {
      statusListeners.add(listener);
      return () => statusListeners.delete(listener);
    },
    () => status,
  );
}
