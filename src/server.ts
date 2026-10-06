import "./lib/error-capture";

import { AsyncLocalStorage } from "node:async_hooks";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RequestState = { incomingAbort: boolean };

const requestState = new AsyncLocalStorage<RequestState>();

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function isIncomingRequestAbort(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== "object" || depth > 5) return false;
  const value = error as { message?: unknown; code?: unknown; cause?: unknown; stack?: unknown };
  if (value.code === "ECONNRESET" || value.code === "ECONNABORTED" || value.code === "EPIPE") {
    return true;
  }
  if (
    value.message === "aborted" &&
    typeof value.stack === "string" &&
    value.stack.includes("abortIncoming")
  ) {
    return true;
  }
  return isIncomingRequestAbort(value.cause, depth + 1);
}

const consoleErrorHost = globalThis as typeof globalThis & {
  __ssrOriginalConsoleError?: typeof console.error;
};
if (!consoleErrorHost.__ssrOriginalConsoleError) {
  consoleErrorHost.__ssrOriginalConsoleError = console.error.bind(console);
}
const originalConsoleError = consoleErrorHost.__ssrOriginalConsoleError;

console.error = (...args: unknown[]) => {
  if (args.some((arg) => isIncomingRequestAbort(arg))) {
    const state = requestState.getStore();
    if (state) state.incomingAbort = true;
    return;
  }
  originalConsoleError(...args);
};

function clientDisconnected(request: Request, state: RequestState): boolean {
  return request.signal.aborted || state.incomingAbort;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
// A browser disconnect during Vite's first dependency optimization is the same shape
// and must not replace the response with the error page.
async function normalizeCatastrophicSsrResponse(
  response: Response,
  request: Request,
  state: RequestState,
): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  if (clientDisconnected(request, state) || isIncomingRequestAbort(captured)) {
    return new Response(null, { status: 499 });
  }

  console.error(captured ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

const errorPage = () =>
  new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const state: RequestState = { incomingAbort: false };
    return requestState.run(state, async () => {
      // Touch the signal early so srvx subscribes to the socket close
      // before a client abort lands.
      void request.signal.aborted;
      try {
        const handler = await getServerEntry();
        const response = await handler.fetch(request, env, ctx);
        return await normalizeCatastrophicSsrResponse(response, request, state);
      } catch (error) {
        if (clientDisconnected(request, state) || isIncomingRequestAbort(error)) {
          return new Response(null, { status: 499 });
        }
        originalConsoleError(error);
        return errorPage();
      }
    });
  },
};
