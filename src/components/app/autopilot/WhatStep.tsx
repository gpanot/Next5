'use client';

import { Sparkles } from 'lucide-react';
import { useApi } from '../../../hooks/useApi';
import type { ListingDto } from '../../../types/business/listings';
import { Chip } from '../../ui/Chip';
import { SkeletonText } from '../../ui/Skeleton';
import { DisclosureForm, type DisclosureDraft } from './DisclosureForm';
import { HomePicker } from './HomePicker';
import { MarketAreaForm, type AreaDraft } from './MarketAreaForm';
import { MomentCards } from './MomentCards';
import { OpenHouseForm, zillowEventOf, type EventDraft } from './OpenHouseForm';
import { PriceDropForm, type PriceDraft } from './PriceDropForm';

/**
 * `area` and `disclosure` stay null until she edits them; the forms show her saved values (or a suggestion) until then.
 * `event` is filled from Zillow when she picks a home that has an open house, else typed.
 */
export type WhatValue = {
  moment: string;
  listingId: string | null;
  startDate: string;
  channels: string[];
  area: AreaDraft | null;
  event: EventDraft | null;
  price: PriceDraft;
  disclosure: DisclosureDraft | null;
};
export type MarketInfo = { paid: boolean; area: AreaDraft; disclosure: DisclosureDraft; hasDisclosure: boolean };

export const LISTING_MOMENTS = ['just_listed', 'open_house', 'price_drop', 'just_sold'];

const CHANNELS = [
  { id: 'instagram', label: 'Instagram' },
  { id: 'tiktok', label: 'TikTok' },
];

type Props = {
  value: WhatValue;
  market: MarketInfo | null;
  onChange: (patch: Partial<WhatValue>) => void;
  onLocked: () => void;
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-2.5">
    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-app-muted">{title}</h2>
    {children}
  </section>
);

const BLANK_EVENT = (today: string): EventDraft => ({ date: today, start: '13:00', end: '15:00', source: 'typed' });

const EvergreenNote = () => (
  <p className="flex items-start gap-2 rounded-xl border border-app-line bg-app-panel p-4 text-[13px] text-app-muted shadow-sm">
    <Sparkles aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
    One tip carousel on each empty day of the week: buyer and seller myths, closing costs, offer tips… With your face when you picked your
    avatar, clean text slides otherwise. Days that already have a post stay as they are.
  </p>
);

/** The extra question each moment asks: the open house time, the new price, or a note. */
const MomentExtra = ({ value, onChange, today }: Pick<Props, 'value' | 'onChange'> & { today: string }) => {
  if (value.moment === 'open_house') return <OpenHouseForm value={value.event ?? BLANK_EVENT(today)} onChange={(event) => onChange({ event })} />;
  if (value.moment === 'price_drop') return <PriceDropForm value={value.price} onChange={(patch) => onChange({ price: { ...value.price, ...patch } })} />;
  if (value.moment === 'just_sold') return <p className="text-[12px] text-app-muted">We mark this home as sold. Days on market come from Zillow when it has them.</p>;
  return null;
};

/** Step 1: what is happening, which home (or area), when, where. */
export const WhatStep = ({ value, market, onChange, onLocked }: Props) => {
  const listings = useApi<{ listings: ListingDto[] }>('/api/app/listings');
  const isMarket = value.moment === 'market_update';
  const isEvergreen = value.moment === 'evergreen';
  const needsHome = LISTING_MOMENTS.includes(value.moment);
  const area = value.area ?? market?.area ?? { city: '', state: '', zips: '' };
  const disclosure = value.disclosure ?? market?.disclosure ?? { agentName: '', brokerage: '' };
  const today = new Date().toISOString().slice(0, 10);

  const pickHome = (listingId: string | null) => {
    const home = listings.data?.listings.find((l) => l.id === listingId);
    const zillowEvent = home ? zillowEventOf(home.openHouses, today) : null;
    onChange({
      listingId,
      ...(value.event?.source !== 'typed' ? { event: zillowEvent } : {}),
      ...(home?.priceUsd && !value.price.oldPrice ? { price: { ...value.price, oldPrice: home.priceUsd.toLocaleString('en-US') } } : {}),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Section title="What's happening?">
        <MomentCards value={value.moment} onChange={(moment) => onChange({ moment })} locked={market && !market.paid ? ['market_update'] : []} onLocked={onLocked} />
      </Section>

      {isMarket && (
        <Section title="Your area">
          <MarketAreaForm value={area} onChange={(patch) => onChange({ area: { ...area, ...patch } })} />
        </Section>
      )}
      {isEvergreen && <EvergreenNote />}
      {needsHome && (
        <Section title="Which home?">
          {listings.loading && !listings.data ? (
            <SkeletonText lines={3} />
          ) : (
            <HomePicker listings={listings.data?.listings ?? []} value={value.listingId} onChange={pickHome} onRefresh={listings.refresh} />
          )}
          {listings.error && <p className="text-[13px] text-app-danger">{listings.error}</p>}
          <MomentExtra value={value} onChange={onChange} today={today} />
          {market && !market.hasDisclosure && <DisclosureForm value={disclosure} onChange={(patch) => onChange({ disclosure: { ...disclosure, ...patch } })} />}
        </Section>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {value.moment !== 'open_house' && (
          <Section title={isMarket ? 'Post on' : isEvergreen ? 'Fill from' : 'Start'}>
            <input
              type="date"
              min={today}
              value={value.startDate}
              onChange={(e) => onChange({ startDate: e.target.value || today })}
              className="h-11 rounded-xl border border-app-line bg-app-panel px-3 text-[14px] text-app-ink transition-colors duration-200 focus:border-app-accent focus:outline-none"
            />
          </Section>
        )}
        <Section title="Channels">
          <div className="flex flex-wrap gap-2">
            {CHANNELS.map((c) => {
              const on = value.channels.includes(c.id);
              return (
                <Chip key={c.id} selected={on} onClick={() => onChange({ channels: on ? value.channels.filter((x) => x !== c.id) : [...value.channels, c.id] })}>
                  {c.label}
                </Chip>
              );
            })}
          </div>
        </Section>
      </div>
    </div>
  );
};
