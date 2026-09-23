'use client';

/**
 * The content-template library, fetched once per page session.
 *
 * The library used to be a hardcoded constant, so every widget could import it synchronously.
 * It now lives in the database (Phase 0B), and this module keeps that from turning into one
 * request per research card: the fetch is memoised per admin token.
 */
import { useEffect, useState } from 'react';
import { adminFetch } from '../business/useAdminApi';
import { resolveTemplate, type TemplateDto } from '../../../lib/contentTemplates';

const cache = new Map<string, Promise<TemplateDto[]>>();

export const loadContentTemplates = (token: string): Promise<TemplateDto[]> => {
  const cached = cache.get(token);
  if (cached) return cached;

  const pending = adminFetch<{ templates: TemplateDto[] }>(token, '/api/admin/content-templates?status=active')
    .then((data) => data.templates ?? [])
    .catch(() => {
      cache.delete(token);
      return [];
    });
  cache.set(token, pending);
  return pending;
};

export type ContentTemplates = {
  templates: TemplateDto[];
  loading: boolean;
  /** The classifier's template when it gave one, else the best keyword match. Null while loading. */
  resolve: (legacyId: number | null | undefined, hook: string) => TemplateDto | null;
};

export const useContentTemplates = (token: string | undefined): ContentTemplates => {
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    loadContentTemplates(token).then((list) => {
      if (cancelled) return;
      setTemplates(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  return {
    templates,
    loading,
    resolve: (legacyId, hook) => resolveTemplate(legacyId, hook, templates),
  };
};
