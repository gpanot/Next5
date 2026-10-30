// server-only — never import from a 'use client' file.

/**
 * The dev server's environment minus every Anthropic credential (.env.local has ANTHROPIC_API_KEY for the app): with
 * one set, `claude` bills the API instead of using Guillaume's Claude Code login. The director must run on the plan.
 */
export const subscriptionEnv = (): NodeJS.ProcessEnv => {
  const env = { ...process.env };
  for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_BASE_URL', 'CLAUDE_CODE_USE_BEDROCK', 'CLAUDE_CODE_USE_VERTEX']) delete env[key];
  return env;
};
