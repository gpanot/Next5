import type { ReactNode } from 'react';

type StepFooterProps = {
  children: ReactNode;
  aside?: ReactNode;
};

export const StepFooter = ({ children, aside }: StepFooterProps) => (
  <div className="sticky bottom-0 -mx-5 mt-8 border-t border-line bg-page/92 px-5 pt-4 pb-5 backdrop-blur-md sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      {aside ? <div className="text-[12.5px] text-muted">{aside}</div> : <span />}
      <div className="w-full sm:w-auto">{children}</div>
    </div>
  </div>
);
