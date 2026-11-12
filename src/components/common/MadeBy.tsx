import React from 'react';

// Small credit at the very bottom of every screen. Kept quiet on purpose -
// small, grey, under the studio's own content - so Studio Deny stays the
// brand people see. Opens the AR Tech Studio website in a new tab.
export const MadeBy: React.FC = () => (
  <footer className="pt-4 pb-6 px-4 flex justify-center no-print">
    <a
      href="https://artechstudio.co.in"
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col items-center gap-1.5 text-[11px] font-mono uppercase text-[#4A4844] hover:text-[#111111]"
    >
      <img src="/ar-tech-studio.png" alt="AR Tech Studio" width={22} height={22} className="w-[22px] h-[22px]" />
      <span>
        Developed and maintained by <span className="font-bold">AR Tech Studio</span>
      </span>
    </a>
  </footer>
);
