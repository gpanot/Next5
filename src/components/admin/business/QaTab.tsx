'use client';

import { useAdminApi } from './useAdminApi';

type QaItem = { id: string; batchName: string; workspace: string; product: string; reason: string | null; rating: number | null; status: string; freeRedosUsed: number; shot: string | null; sceneId: string | null; format: string; outputUrl: string | null; inputUrls: (string | null)[]; prompt: string };

export const QaTab = ({ token }: { token: string }) => {
  const { data, error, loading } = useAdminApi<{ items: QaItem[] }>(token, '/api/admin/business/qa');
  if (error) return <p className="text-[13px] text-red-700">{error}</p>;
  if (loading && !data) return <p className="text-[13px] text-[#6e655c]">Loading…</p>;
  if (!data?.items.length) return <p className="text-[13px] text-[#6e655c]">No redone or down-rated photos yet.</p>;
  return (
    <ul className="flex flex-col gap-4">
      {data.items.map((item) => (
        <li key={item.id} className="rounded-xl border border-[#e9e1d6] bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px]">
            <p className="font-medium text-[#221f1c]">{item.workspace} · {item.batchName}</p>
            <p className="text-[#6e655c]">{item.reason ?? `rated ${item.rating}`} · {item.shot ?? item.sceneId} · {item.format} · redos {item.freeRedosUsed} · {item.status}</p>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {item.inputUrls.map((url, i) => url && (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img key={i} src={url} alt={`Input ${i + 1}`} className="h-40 rounded-lg object-cover ring-1 ring-[#e9e1d6]" />
            ))}
            {item.outputUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- signed storage URL
              <img src={item.outputUrl} alt="Output" className="h-40 rounded-lg object-cover ring-2 ring-[#9c5c3a]" />
            )}
          </div>
          <details className="mt-2 text-[12px] text-[#6e655c]"><summary className="cursor-pointer">Prompt</summary><pre className="mt-1 whitespace-pre-wrap">{item.prompt}</pre></details>
        </li>
      ))}
    </ul>
  );
};
