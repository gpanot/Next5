'use client';

import { LibraryView } from '../../../../src/components/app/library/LibraryView';
import { AppPage } from '../../../../src/components/app/shell/AppShell';
import { useWorkspace } from '../../../../src/components/app/shell/WorkspaceProvider';
import { TikTokLibraryView } from '../../../../src/components/app/tiktokLibrary/TikTokLibraryView';

export default function LibraryPage() {
  const { product } = useWorkspace();
  return product === 'shop'
    ? <AppPage title="TikTok library"><TikTokLibraryView /></AppPage>
    : <AppPage title="Library"><LibraryView /></AppPage>;
}
