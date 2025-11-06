/**
 * Type definitions for the LLM chat application.
 */

export interface Env {
  /**
   * Binding for the Workers AI API.
   */
  AI: Ai;

  /**
   * Binding for static assets.
   */
  ASSETS: { fetch: (request: Request) => Promise<Response> };

  /**
   * n8n webhook for Text-to-Video (server-side proxy avoids direct browser request)
   */
  N8N_T2V_WEBHOOK_URL?: string;
  /**
   * Optional defaults for adapter
   */
  N8N_REMIX_TARGET_ID?: string;
  N8N_MODEL?: string;
}

/**
 * Represents a chat message.
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
