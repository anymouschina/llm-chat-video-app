/**
 * LLM Chat Application Template
 *
 * A simple chat application using Cloudflare Workers AI.
 * This template demonstrates how to implement an LLM-powered chat interface with
 * streaming responses using Server-Sent Events (SSE).
 *
 * @license MIT
 */
import { Env, ChatMessage } from "./types";

// Model ID for Workers AI model
// https://developers.cloudflare.com/workers-ai/models/
const MODEL_ID = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";

// Default system prompt
const SYSTEM_PROMPT =
  "You are a helpful, friendly assistant. Provide concise and accurate responses.";

export default {
  /**
   * Main request handler for the Worker
   */
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);

    // T2V API (server-side proxy to n8n)
    if (url.pathname === "/api/t2v") {
      if (request.method === "OPTIONS") return corsPreflight();
      if (request.method === "POST") return handleTextToVideo(request, env);
      return withCors(new Response("Method not allowed", { status: 405 }));
    }

    // Handle static assets (frontend)
    if (!url.pathname.startsWith("/api/")) {
      return env.ASSETS.fetch(request);
    }

    // API Routes
    if (url.pathname === "/api/chat") {
      // Handle POST requests for chat
      if (request.method === "POST") {
        return handleChatRequest(request, env);
      }

      // Method not allowed for other request types
      return new Response("Method not allowed", { status: 405 });
    }

    // Handle 404 for unmatched routes
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

/**
 * Handles chat API requests
 */
async function handleChatRequest(
  request: Request,
  env: Env,
): Promise<Response> {
  try {
    // Parse JSON request body
    const { messages = [] } = (await request.json()) as {
      messages: ChatMessage[];
    };

    // Add system prompt if not present
    if (!messages.some((msg) => msg.role === "system")) {
      messages.unshift({ role: "system", content: SYSTEM_PROMPT });
    }

    const response = await env.AI.run(
      MODEL_ID,
      {
        messages,
        max_tokens: 1024,
      },
      {
        returnRawResponse: true,
        // Uncomment to use AI Gateway
        // gateway: {
        //   id: "YOUR_GATEWAY_ID", // Replace with your AI Gateway ID
        //   skipCache: false,      // Set to true to bypass cache
        //   cacheTtl: 3600,        // Cache time-to-live in seconds
        // },
      },
    );

    // Return streaming response
    return response;
  } catch (error) {
    console.error("Error processing chat request:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      },
    );
  }
}

/**
 * Proxy Text-to-Video to n8n webhook (server-side fetch to avoid CORS).
 */
async function handleTextToVideo(request: Request, env: Env): Promise<Response> {
  try {
    const raw = (await request.json()) as any;
    let payload: any;

    if (raw && typeof raw === "object" && raw.kind === "video") {
      // If client already provides full payload, pass-through as-is
      payload = raw;
    } else {
      // Build strict payload from prompt/params
      const prompt: string = String(raw?.prompt ?? "");
      const params = (raw?.params ?? {}) as Record<string, unknown>;
      const duration = Number((params as any).duration ?? (params as any).durationSec ?? 10);
      const fps = Number((params as any).fps ?? 30);
      const n_frames = Math.max(1, Math.min(1200, Math.round(duration * fps)));
      const aspect = String((params as any).aspect ?? "16:9");
      const orientation = aspect === "9:16" ? "portrait" : aspect === "1:1" ? "square" : "landscape";
      const size = String((params as any).size ?? "small");
      const remix_target_id = env.N8N_REMIX_TARGET_ID || null;
      const model = env.N8N_MODEL || "turbo";
      payload = {
        kind: "video",
        prompt,
        title: null,
        orientation,
        size,
        n_frames,
        inpaint_items: [] as any[],
        remix_target_id,
        metadata: null,
        cameo_ids: null,
        cameo_replacements: null,
        model,
        style_id: null,
        audio_caption: null,
        audio_transcript: null,
        video_caption: null,
        storyboard_id: null,
      };
    }

    const webhook = env.N8N_T2V_WEBHOOK_URL;
    if (!webhook) {
      return withCors(
        new Response(JSON.stringify({ error: "missing_webhook" }), {
          status: 500,
          headers: { "content-type": "application/json" },
        }),
      );
    }

    const upstream = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });

    const ok = upstream.ok;
    const text = await upstream.text().catch(() => "");
    return withCors(
      new Response(
        JSON.stringify({ ok, status: upstream.status, body: text.slice(0, 2048) }),
        { status: ok ? 202 : upstream.status, headers: { "content-type": "application/json" } },
      ),
    );
  } catch (error) {
    console.error("T2V proxy error", error);
    return withCors(
      new Response(JSON.stringify({ error: "bad_request" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    );
  }
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
  } as Record<string, string>;
}

function withCors(res: Response) {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders())) h.set(k, v);
  return new Response(res.body, { status: res.status, headers: h });
}

function corsPreflight() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}
