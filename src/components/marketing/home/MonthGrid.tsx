import { Camera, Play } from 'lucide-react';
import { HOME_MONTH, type MonthTile } from '../../../content/business/home';
import { MarketingImage } from '../shared/MarketingImage';

const Tile = ({ tile }: { tile: MonthTile }) => (
  <li className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-app-sunken ring-1 ring-black/5 dark:ring-white/10">
    <MarketingImage src={tile.image} sizes="(min-width: 1024px) 30vw, 50vw" className="object-[center_20%]" />
    {tile.kind === 'video' && (
      <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 shadow-md" aria-hidden>
        <Play className="ml-0.5 h-5 w-5 fill-ink text-ink" />
      </span>
    )}
    <span className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
      {tile.kind === 'video' ? <Play aria-hidden className="h-3 w-3 fill-white" /> : <Camera aria-hidden className="h-3 w-3" />}
      {tile.kind === 'video' ? 'Video' : 'Photo'} · {tile.who}
    </span>
  </li>
);

/** Six sample outputs, photos and videos, for both buyers. Pictures first, almost no words. */
export const MonthGrid = () => (
  <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
    {HOME_MONTH.tiles.map((tile) => <Tile key={tile.image} tile={tile} />)}
  </ul>
);
