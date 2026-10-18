// The approval link the Claude connector hands out, and its reading on the calendar page. Shared, pure.

/**
 * The calendar with the approval sheet open (`approve=all`), in list view. `pins` puts slideshows made from ideas on
 * their planned days (the calendar keeps pins in the browser, so a new device needs them in the link).
 */
export const approvalPath = (workspaceId: string, pins: Array<{ slideshowId: string; at: Date }>): string => {
  const q = new URLSearchParams({ view: 'list', approve: 'all' });
  if (pins.length > 0) q.set('pins', pins.slice(0, 40).map((p) => `${p.slideshowId}~${p.at.toISOString()}`).join(','));
  return `/slideshow/${encodeURIComponent(workspaceId)}?${q.toString()}`;
};

/** The `pins` parameter back as slideshow id → ISO time (bad entries dropped). Used by the calendar page. */
export const parsePins = (raw: string | null): Record<string, string> =>
  Object.fromEntries(
    (raw ?? '').split(',').flatMap((entry) => {
      const [id, iso] = entry.split('~');
      return id && iso && /^[a-z0-9]{8,40}$/i.test(id) && !Number.isNaN(Date.parse(iso)) ? [[id, new Date(iso).toISOString()]] : [];
    }),
  );
