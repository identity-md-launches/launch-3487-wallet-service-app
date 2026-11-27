/** The IMD EDGE mark: an apex "A" read as a rising edge, with a crossbar. Original artwork. */
export function Logo() {
  return (
    <span className="logo">
      <svg width="32" height="32" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <rect width="64" height="64" rx="14" fill="var(--color-mark-bg)" />
        <path d="M18 46 L32 18 L46 46" fill="none" stroke="var(--color-accent)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M24 36 H40" stroke="var(--color-text)" strokeWidth="5" strokeLinecap="round" />
      </svg>
      <span className="logo-word">
        IMD <b>EDGE</b>
      </span>
    </span>
  );
}
