// server-only — never import from a 'use client' file.
// The Next5 MCP server Claude talks to (/api/mcp): one stateless server per request, for one signed-in caller.

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { HttpError } from '../http';
import type { McpCaller } from './oauthStore';
import { addToCalendar, approvalInfo, calendarPosts, getIdeas, listWorkspaces, requestSlideshows, skipIdeas } from './planner';

const INSTRUCTIONS = `Next5 makes short-form posts (TikTok, Instagram, YouTube Shorts) for a small business from its website.
Two formats: "video" (a narrated Blitz video, ~25 s, 7 on-screen lines: hook, pain, old way, mechanism, proof, cost of waiting, call to action) and "slideshow" (a photo carousel).
Typical flow: get_post_ideas for the week -> show the ideas to the user (day, format, hook) -> skip_ideas for ones they reject (the day gets a fresh one) -> add_to_calendar with the ones they pick (with "hook" for any video you show with one of its other_hooks) -> give them the approval_url.
Ideas are free. Putting one on the calendar costs 1 credit (as in the app). Nothing is ever published from here: every post waits for the user's approval in Next5, so always end by sharing the approval_url.
Times are in the workspace's local time zone.`;

const workspaceArg = z.string().optional().describe('Workspace id from list_workspaces. Omit to use the workspace picked when Next5 was connected.');

const ok = (data: unknown) => ({ content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] });

/** A tool's failure as text Claude can relay (an HttpError's message is written for the user). */
const failure = (err: unknown) => {
  const message = err instanceof HttpError ? err.message : 'Next5 had a problem doing that. Try again in a moment.';
  if (!(err instanceof HttpError) || err.status >= 500) console.error('[mcp] tool failed:', err);
  return { content: [{ type: 'text' as const, text: message }], isError: true };
};

const run = async (fn: () => Promise<unknown>) => {
  try {
    return ok(await fn());
  } catch (err) {
    return failure(err);
  }
};

export function createNext5Server(caller: McpCaller): McpServer {
  const server = new McpServer({ name: 'next5', version: '1.0.0', title: 'Next5' }, { instructions: INSTRUCTIONS });

  server.registerTool('list_workspaces', {
    title: 'List workspaces',
    description: 'The user\'s Next5 workspaces (one per business website), with their connected TikTok/Instagram accounts.',
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, () => run(() => listWorkspaces(caller)));

  server.registerTool('get_post_ideas', {
    title: 'Get post ideas',
    description: 'Post ideas planned on the calendar for a window of days (default: the 7 days from tomorrow), written for the business by Next5. '
      + 'When the window has fewer video ideas than days, Next5 writes a new free batch first (can take about a minute). '
      + 'Each idea has an id, format (video or slideshow), planned day and time, hook and script. Free.',
    inputSchema: {
      workspace_id: workspaceArg,
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('First day, YYYY-MM-DD, workspace local time. Default: tomorrow.'),
      days: z.number().int().min(1).max(14).optional().describe('How many days. Default 7, max 14.'),
      format: z.enum(['any', 'video', 'slideshow']).optional().describe('Only this format. Default any.'),
      write_more: z.boolean().optional().describe('Write a new batch when the window is short of ideas. Default true.'),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, (a) => run(() => getIdeas(caller, { workspaceId: a.workspace_id, startDate: a.start_date, days: a.days, format: a.format, writeMore: a.write_more })));

  server.registerTool('request_slideshow_ideas', {
    title: 'Request slideshow ideas',
    description: 'Starts 3 new photo slideshow ideas, made in the background (1-2 minutes); then call get_post_ideas with format "slideshow". '
      + 'Free until added to the calendar, but the credit balance must cover all 3.',
    inputSchema: { workspace_id: workspaceArg },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, (a) => run(() => requestSlideshows(caller, a.workspace_id)));

  server.registerTool('skip_ideas', {
    title: 'Skip ideas',
    description: 'Skips ideas the user does not want. A skipped video idea\'s day gets another idea from the reserve (call get_post_ideas again to see it). Free.',
    inputSchema: { workspace_id: workspaceArg, idea_ids: z.array(z.string()).min(1).max(20) },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, (a) => run(() => skipIdeas(caller, a.idea_ids, a.workspace_id)));

  server.registerTool('add_to_calendar', {
    title: 'Add ideas to the calendar',
    description: 'Puts the picked ideas on the Next5 calendar as posts waiting for the user\'s approval. Costs 1 credit per post '
      + '(a video\'s credit is refunded if it is not approved in time). Optionally moves an idea to another day/time first, or gives a video another hook from its other_hooks. '
      + 'Does NOT publish. Returns what was added, what failed and why, and the approval_url the user must open to approve.',
    inputSchema: {
      workspace_id: workspaceArg,
      ideas: z.array(z.object({
        id: z.string(),
        planned_at: z.string().datetime({ offset: true }).optional().describe('Move it to this time first (ISO 8601 with offset), from tomorrow on.'),
        hook: z.string().optional().describe('Videos: open with this hook instead, copied exactly from the idea\'s other_hooks. '
          + 'If you show the user another hook than `hook`, pass it here, or the post keeps the original one.'),
      })).min(1).max(20),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  }, (a) => run(() => addToCalendar(caller, a.ideas.map((i) => ({ id: i.id, plannedAt: i.planned_at, hook: i.hook })), a.workspace_id)));

  server.registerTool('get_calendar', {
    title: 'Get calendar',
    description: 'Posts already on the calendar in a window (default: the 7 days from tomorrow): videos and slideshows, their status (waiting_for_approval, scheduled, posted...) and links once posted.',
    inputSchema: {
      workspace_id: workspaceArg,
      start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('First day, YYYY-MM-DD. Default: tomorrow.'),
      days: z.number().int().min(1).max(31).optional().describe('Default 7, max 31.'),
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, (a) => run(() => calendarPosts(caller, { workspaceId: a.workspace_id, startDate: a.start_date, days: a.days })));

  server.registerTool('get_approval_link', {
    title: 'Get approval link',
    description: 'How many posts wait for approval and the link that opens Next5\'s approval screen. Publishing is only ever approved there, by the user.',
    inputSchema: { workspace_id: workspaceArg },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, (a) => run(() => approvalInfo(caller, a.workspace_id)));

  return server;
}
