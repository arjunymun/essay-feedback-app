import fs from "node:fs";
import path from "node:path";

const requiredTables = [
  "submissions",
  "credit_ledger",
  "credit_purchases",
  "review_jobs",
  "documents",
  "document_sections",
  "document_chunks",
  "claims",
  "evidence_sources",
  "claim_evidence",
  "review_reports",
  "agent_traces",
  "model_usage_events",
  "eval_cases",
  "eval_runs",
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
      .map((line) => {
        const [key, ...rest] = line.split("=");
        return [key, rest.join("=").replace(/^"|"$/g, "")];
      }),
  );
}

const env = {
  ...loadEnvFile(path.join(process.cwd(), ".env.local")),
  ...process.env,
};

const projectRef = env.NEXT_PUBLIC_SUPABASE_PROJECT_REF || "";
const supabaseUrl =
  env.NEXT_PUBLIC_SUPABASE_URL ||
  (projectRef ? `https://${projectRef}.supabase.co` : "");
const secretKey = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || "";
const publishableKey =
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";
const apiKey = secretKey || publishableKey;

if (!supabaseUrl || !apiKey) {
  console.error("Missing Supabase URL or API key. Check .env.local.");
  process.exit(1);
}

async function checkTable(table) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: apiKey,
      ...(secretKey ? { Authorization: `Bearer ${secretKey}` } : {}),
    },
  });

  return {
    table,
    ok: response.ok,
    status: response.status,
  };
}

const results = await Promise.all(requiredTables.map(checkTable));
const missing = results.filter((result) => !result.ok);

console.log(
  JSON.stringify(
    {
      projectRef: projectRef || "from-url",
      checked: results.length,
      ok: results.length - missing.length,
      missingOrUnauthorized: missing,
    },
    null,
    2,
  ),
);

if (missing.length) {
  process.exit(1);
}
