import OpenAI from "openai";

import { env, flags } from "@/lib/env";

export type EmbeddingProvider = (inputs: string[]) => Promise<number[][] | null>;

function createClient() {
  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
}

export async function generateEmbeddings(inputs: string[]) {
  if (!flags.hasOpenAI || inputs.length === 0) {
    return null;
  }

  const client = createClient();
  const response = await client.embeddings.create({
    model: env.OPENAI_EMBEDDING_MODEL,
    input: inputs,
  });

  return response.data.map((item) => item.embedding);
}
