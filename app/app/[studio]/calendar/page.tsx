'use client';

import { CalendarView } from '../../../../src/components/app/calendar/CalendarView';
import { BrandOnly } from '../../../../src/components/app/shell/BrandOnly';
import { AppPage } from '../../../../src/components/app/shell/AppShell';

export default function CalendarPage() {
  return (
    <AppPage title="Calendar">
      <BrandOnly>
        <CalendarView />
      </BrandOnly>
    </AppPage>
  );
}
