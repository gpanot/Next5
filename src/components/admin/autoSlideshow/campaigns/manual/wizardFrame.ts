/** The wizard's sheet: one size from the first step to the last (a bottom sheet on phones, a wide fixed window on
 *  desktops), so it never grows or shrinks while the story or photo changes. The wizard scrolls its own body. */
export const WIZARD_FRAME =
  'flex h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-app-panel shadow-xl sm:h-[min(46rem,90dvh)] sm:max-w-3xl sm:rounded-2xl lg:max-w-6xl';
