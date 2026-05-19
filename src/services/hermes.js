const SYSTEM_PROMPT = `You are Fallow's background intelligence layer. Fallow is a personal repository for abandoned and dormant ideas called Seeds. Your three jobs: 1. BRANCHES — find relevant articles/media/links for a seed using web search. 2. ROOTS — find thematic connections between seeds. 3. CONDITIONS — identify which seeds are unblocked by a condition change. Always respond in English. Always respond in structured JSON only — no other text outside the JSON.`;

function stripSessionLine(raw) {
  // Hermes appends a session ID line at the end — remove it
  return raw.replace(/\n?[Ss]ession(\s*ID)?:\s*\S+\s*$/, '').trim();
}

function sanitizeJson(str) {
  // Strip non-ASCII chars injected between tokens by the model (e.g. CJK glyphs)
  let s = str.replace(/[^\x00-\x7F]/g, '');
  // Fix doubled opening quote on property names: {""key": → {"key":
  s = s.replace(/""\s*([^"]+)"\s*:/g, '"$1":');
  // Replace unescaped literal newlines/tabs inside JSON strings
  return s.replace(/"((?:[^"\\]|\\.)*)"/g, (match) =>
    match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  );
}

function parseJsonResponse(text) {
  const cleaned = stripSessionLine(text);
  const fenced = cleaned.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch { return JSON.parse(sanitizeJson(fenced[1])); }
  }
  const bare = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (bare) {
    try { return JSON.parse(bare[1]); } catch { return JSON.parse(sanitizeJson(bare[1])); }
  }
  throw new Error('No JSON found in Hermes response');
}

async function hermesCall(taskPayload) {
  if (!window.fallow?.hermesChat) {
    throw new Error('hermesChat not available — not running inside Electron');
  }
  const prompt = `${SYSTEM_PROMPT}\n\nTask:\n${JSON.stringify(taskPayload, null, 2)}`;
  const raw = await window.fallow.hermesChat(prompt);
  console.log('HERMES RAW:', raw);
  return parseJsonResponse(raw);
}

/**
 * BRANCHES — find relevant articles/media/links for a single seed.
 * @param {{ id: string, title: string, context: string, tags: string[] }} seed
 */
export async function getBranches(seed, { specificRequest, dislikes } = {}) {
  const payload = {
    task: 'BRANCHES',
    instructions: 'Search the web for relevant articles, videos, and links for this seed. Use both keyword analysis (extract key terms from the seed title, context, and tags and search for those directly) and semantic analysis (reason about the underlying concepts, adjacent domains, and related disciplines the seed touches on, even when not explicitly named) to find results. Combine both signals to select content that is genuinely relevant to the seed\'s specific goals and interests. Return ONLY a JSON object with a "results" array. Each item must have "title", "url", and "summary" fields. No other keys.',
    expected_format: { results: [{ title: 'string', url: 'string', summary: 'string' }] },
    seed: {
      id: seed.id,
      title: seed.title,
      context: seed.context,
      tags: seed.tags,
    },
  };
  if (specificRequest) payload.specificRequest = specificRequest;
  if (dislikes?.length) payload.avoid = dislikes.map((d) => d.title);
  const result = await hermesCall(payload);
  if (Array.isArray(result)) return result;
  if (Array.isArray(result.results)) return result.results;
  if (Array.isArray(result.branches)) return result.branches;
  if (result.results && Array.isArray(result.results.articles)) return result.results.articles;
  throw new Error('Unexpected BRANCHES shape: ' + JSON.stringify(result));
}

/**
 * ROOTS — find thematic connections across all seeds.
 * @param {Array<{ id: string, title: string, tags: string[], context?: string }>} seeds
 * @param {{ focusSeed?: { title: string } }} options
 */
export async function getRoots(seeds, { focusSeed } = {}) {
  const instructions = focusSeed
    ? `You are a rigorous intellectual connector. Your job is to find genuine, specific connections between the seed titled "${focusSeed.title}" and each of the other seeds. A valid connection must go beyond shared category or tag � it must identify a concrete overlap in methodology, underlying technology, historical precedent, human behavior being addressed, material or spatial constraint, design challenge, or cultural context. For each valid pair, write one description that names the specific thing they share � a technique, a problem, a precedent, a user need, a constraint � and explains precisely why that overlap is meaningful. Reference both seeds by name. Do not connect seeds based on category alone. Do not use vague aesthetic language. Be specific and analytical. Return a JSON object with a "connections" array where each item has "seed1" (always "${focusSeed.title}"), "seed2" (the other seed title), and "description". Omit any pair where no concrete connection exists.`
    : 'You are a rigorous intellectual connector. Find concrete connections between every pair of seeds that share a genuine overlap in methodology, underlying technology, historical precedent, human behavior being addressed, material or spatial constraint, design challenge, or cultural context. A valid connection must go beyond shared category or tag. For each valid pair write one description that names the specific thing they share and explains precisely why that overlap is meaningful. Every description must be unique to that exact pair and reference both seeds by name. Do not connect seeds based on category alone. Do not use vague aesthetic language. Return a JSON object with a "connections" array where each item has "seed1", "seed2", and "description". Omit pairs with no concrete connection.';
  return hermesCall({
    task: 'ROOTS',
    instructions,
    expected_format: { connections: [{ seed1: 'string', seed2: 'string', description: 'string' }] },
    seeds: seeds.map((s) => ({
      id: s.id,
      title: s.title,
      tags: s.tags,
      context: s.context,
    })),
    ...(focusSeed ? { focus_seed: focusSeed.title } : {}),
  });
}

/**
 * CONDITIONS — identify seeds unblocked by a condition change.
 * @param {{ title: string, context: string }} condition
 * @param {Array<{ id: string, title: string, blocker: string }>} seeds
 */
export async function checkConditions(condition, seeds) {
  return hermesCall({
    task: 'CONDITIONS',
    instructions: 'Use both keyword analysis (check whether terms from the condition title and context directly appear in or overlap with each seed\'s blocker) and semantic analysis (reason about whether the meaning and intent of the condition resolves the core conceptual barrier described in each seed\'s blocker, even when different vocabulary is used) to identify impacted seeds. A seed is unblocked if the condition addresses the constraint preventing progress, whether the match is explicit or only semantically implied. Return a JSON object with an "unblockedSeeds" array. Each item must have "id", "title", "blocker", "status" (UNBLOCKED or PARTIALLY_UNBLOCKED), and "reason" fields.',
    expected_format: { unblockedSeeds: [{ id: 'string', title: 'string', blocker: 'string', status: 'string', reason: 'string' }] },
    condition: {
      title: condition.title,
      context: condition.context,
    },
    seeds: seeds.map((s) => ({
      id: s.id,
      title: s.title,
      blocker: s.blocker,
    })),
  });
}
