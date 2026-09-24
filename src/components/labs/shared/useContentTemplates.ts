'use client';

/**
 * The content-template library, fetched once per page session.
 *
 * The library used to be a hardcoded constant, so every widget could import it synchronously.
 * It now lives in the database (Phase 0B), and this module keeps that from turning into one
 * request per research card: the fetch is memoised per client.
 */
import { useEffect, useState } from 'react';
import { useLabClient } from '../LabClientProvider';
import { errorOf, type LabClient } from '../labClient';
import { resolveTemplate, type TemplateDto } from '../../../lib/contentTemplates';

const cache = new Map<string, Promise<TemplateDto[]>>();

export const loadContentTemplates = (client: LabClient): Promise<TemplateDto[]> => {
  const cached = cache.get(client.id);
  if (cached) return cached;

  const pending = client
    .request<{ templates: TemplateDto[] }>('/content-templates?status=active')
    .then((res) => {
      if (!res.ok) throw new Error(errorOf(res));
      return res.data.templates ?? [];
    })
    .catch(() => {
      cache.delete(client.id);
      return [];
    });
  cache.set(client.id, pending);
  return pending;
};

export type ContentTemplates = {
  templates: TemplateDto[];
  loading: boolean;
  /** The classifier's template when it gave one, else the best keyword match. Null while loading. */
  resolve: (legacyId: number | null | undefined, hook: string) => TemplateDto | null;
};

export const useContentTemplates = (): ContentTemplates => {
  const client = useLabClient();
  const [templates, setTemplates] = useState<TemplateDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadContentTemplates(client).then((list) => {
      if (cancelled) return;
      setTemplates(list);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [client]);

  return {
    templates,
    loading,
    resolve: (legacyId, hook) => resolveTemplate(legacyId, hook, templates),
  };
};
