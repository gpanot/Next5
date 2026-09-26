'use client';

import { useWorkspace } from '../shell/WorkspaceProvider';
import { InfluencersList } from './InfluencersList';
import { ShopModelsList } from './models/ShopModelsList';

/**
 * Brand → AI influencer portrait grid.
 * Shop → Studio Models, each with the scenes she poses in.
 */
export const SetsList = ({ showArchived = false }: { showArchived?: boolean }) => {
  const { product } = useWorkspace();
  if (product === 'brand') return <InfluencersList showArchived={showArchived} />;
  return <ShopModelsList />;
};
