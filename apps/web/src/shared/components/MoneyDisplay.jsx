import React from 'react';

/**
 * Renders currency values cleanly converted from integer paise to Rupees (₹)
 */
export function MoneyDisplay({ paise = 0, currency = 'INR', className = '' }) {
  const rupees = Number(paise) / 100;
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(rupees);

  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      {formatted}
    </span>
  );
}
