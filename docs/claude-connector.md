# Next5 for Claude (MCP connector)

Claude plans a week of posts, and the user approves them in Next5.

> "Give me 7 post ideas for next week, 5 videos and 2 slideshows." → Claude shows them → "Put them on my calendar" →
> Claude adds them (1 credit each) and returns the approval link → the user opens Next5 and taps **Approve & Publish All**.

Claude never publishes anything. There is no publish tool. Every post waits in the calendar's approval sheet, where
TikTok's Direct Post choices (privacy, music consent) are made by a person, as TikTok requires.

## Connect (users)

1. In Claude (web or desktop): **Settings → Connectors → Add custom connector**.
2. URL: `https://next5.giinger.com/api/mcp`. Leave the advanced settings empty.
3. Claude opens Next5's sign-in. Log in (the email link comes back to the same screen), pick the workspace, then tap **Allow**.
4. The connector is now available in Claude on the web, desktop and mobile.

Claude Code: `claude mcp add --transport http next5 https://next5.giinger.com/api/mcp`, then `/mcp` to sign in.

## Tools

| Tool | What it does | Cost |
|---|---|---|
| `list_workspaces` | The user's workspaces and their connected accounts | – |
| `get_post_ideas` | Calendar ideas for a window (default: the 7 days from tomorrow). Writes a new batch when the window is short. | free |
| `request_slideshow_ideas` | 3 photo slideshow ideas, made in the background (1-2 min) | free until kept |
| `skip_ideas` | Skips ideas. A skipped video idea's day is refilled from the reserve. | free |
| `add_to_calendar` | Keeps the picked ideas and puts them on the calendar, waiting for approval. Can move them first. | 1 credit each |
| `get_calendar` | Posts already on the calendar and their status | – |
| `get_approval_link` | How many posts wait for approval, plus the link to the approval sheet | – |

All of this reuses the Content page's engine (`src/server/labs/calendarIdeas.ts`, `blitzSchedule.ts`). The one new piece
of engine code is `src/server/mcp/ideaRender.ts`, which builds a Blitz idea's render request on the server. That request
is built in the browser on the Content page (`deckRenderBody.ts`), so if you change one, change the other too.

## How it is built

- `app/api/mcp/route.ts`: a stateless MCP server (Streamable HTTP, JSON responses). Tools are in `src/server/mcp/server.ts`
  and the logic is in `src/server/mcp/planner.ts`.
- OAuth 2.1 authorization server, with what Claude requires
  ([docs](https://claude.com/docs/connectors/building/authentication)):
  - `/.well-known/oauth-protected-resource[/api/mcp]` and `/.well-known/oauth-authorization-server` are rewritten to
    `app/api/oauth/protected-resource` and `app/api/oauth/metadata` in `next.config.ts`.
  - An unauthenticated `/api/mcp` call gets a 401 with `WWW-Authenticate: Bearer resource_metadata=…`.
  - `POST /api/oauth/register`: Dynamic Client Registration (public clients, no secret). The allowed redirect URIs are
    https, or loopback http on any port (for Claude Code).
  - `/oauth/authorize`: the consent page (Next5 session via `UserGate`). It posts to `/api/oauth/authorize`, which issues
    a one-time code (10 min) bound to the client, the redirect URI, an S256 PKCE challenge and the chosen workspace.
  - `POST /api/oauth/token`: `authorization_code` (PKCE) and `refresh_token`. Access tokens last 1 hour and refresh
    tokens 90 days. Refresh tokens rotate on every use, and reusing an old refresh token revokes the connection.
  - `POST /api/oauth/revoke` (RFC 7009).
  - Tables: `mcp_oauth_clients`, `mcp_oauth_codes`, `mcp_oauth_tokens` (`db/migrations/20261128090000_mcp_oauth.sql`).
    Only SHA-256 hashes of codes and tokens are stored.
- Approval link: `/slideshow/<workspace>?view=list&approve=all&pins=<slideshowId>~<iso>,…`
  (`src/lib/approvalLink.ts`). The calendar (`useLinkedApproval.ts`) pins the slideshows made from ideas on their days
  (pins are stored per browser), then opens the approval sheet.
- Sign-in during connect: `/api/auth/studio/magic` accepts `returnTo` (only `/oauth/authorize?…`), so the email link
  lands back on the consent screen.

## Env

- `NEXT_PUBLIC_APP_URL`: the base of the approval link (already set for email links).
- `MCP_PUBLIC_ORIGIN` (optional): the origin Claude reaches us on, if it differs from the request's own (proxies).

## Test

- `npx vitest run tests/server/mcp`: PKCE and redirect rules, dates, the approval link, the server-built render body,
  and the whole flow over HTTP with an in-memory DB (register → 401 discovery → consent → token → MCP
  initialize/tools/list/tools/call → refresh rotation).
- Live: `npx @modelcontextprotocol/inspector`, then connect to `https://<preview>/api/mcp` and complete the OAuth flow.
