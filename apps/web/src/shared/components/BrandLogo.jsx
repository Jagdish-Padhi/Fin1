import React from 'react';

export function BrandLogo({ onClick, size = 'default', showSubtitle = true, className = '' }) {
  // Proportions:
  // default: 40px (w-10 h-10), ideal for standard h-16 navbar
  // compact: 32px (w-8 h-8), ideal for drawers/smaller cards
  const imgSize = size === 'compact' ? 'w-8 h-8' : 'w-10 h-10';
  const textClass = size === 'compact' ? 'text-lg' : 'text-xl';
  const subClass = 'text-[10px] text-[#5A6A7E] font-medium tracking-tight -mt-0.5';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2.5 select-none ${onClick ? 'cursor-pointer group' : ''} ${className}`}
    >
      <img
        src="/logo.png"
        alt="AsseTrust Logo"
        className={`${imgSize} object-contain shrink-0 transition-transform duration-150 ${onClick ? 'group-hover:scale-105' : ''}`}
      />
      <div className="flex flex-col justify-center">
        <span className={`${textClass} font-extrabold tracking-tight font-['Outfit',sans-serif] leading-tight`}>
          <span className="text-[#0F2A43]">Asse</span>
          <span className="text-[#0F766E]">Trust</span>
        </span>
        {showSubtitle && (
          <span className={subClass}>
            Permissioned Asset Trust Network
          </span>
        )}
      </div>
    </div>
  );
}
