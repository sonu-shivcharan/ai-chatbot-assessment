import type { LLMAdapter } from "./types";
import { GeminiAdapter } from "./providers/gemini.adapter";
import { GroqAdapter } from "./providers/groq.adapter";
import { MockAdapter } from "./providers/mock.adapter";

export type ProviderType = "gemini" | "groq" | "mock";

export class LLMFactory {
  private static instances: Map<ProviderType, LLMAdapter> = new Map();

  static getProvider(provider: ProviderType | string): LLMAdapter {
    const normalizedProvider = (
      provider || "mock"
    ).toLowerCase() as ProviderType;

    // Check cached instance
    if (this.instances.has(normalizedProvider)) {
      return this.instances.get(normalizedProvider)!;
    }

    let adapter: LLMAdapter;

    switch (normalizedProvider) {
      case "gemini":
        adapter = new GeminiAdapter();
        break;
      case "groq":
        adapter = new GroqAdapter();
        break;
      case "mock":
        adapter = new MockAdapter();
        break;
      default:
        console.warn(
          `[LLMFactory] Unknown provider "${provider}". Defaulting to MockAdapter.`,
        );
        adapter = new MockAdapter();
    }

    this.instances.set(normalizedProvider, adapter);
    return adapter;
  }
}
