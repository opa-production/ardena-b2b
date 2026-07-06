/* "Ardena Verified" mark: shield + check. Compact renders the icon alone
   (for tight spots like the sidebar tenant chip); green tints it as a
   positive status pill (e.g. the verification card). */
export default function VerifiedBadge({ compact = false, green = false }) {
  const icon = (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1.7l8 3.2v6.1c0 5.1-3.4 9.7-8 11.3-4.6-1.6-8-6.2-8-11.3V4.9l8-3.2z" />
      <path
        d="M10.9 15.2l-3-3 1.4-1.4 1.6 1.6 4-4 1.4 1.4-5.4 5.4z"
        fill="var(--panel, #fff)"
      />
    </svg>
  );

  if (compact) {
    return (
      <span className="verified-badge compact" title="Ardena Verified">
        {icon}
      </span>
    );
  }
  return (
    <span className={`verified-badge${green ? " green" : ""}`}>
      {icon}Ardena Verified
    </span>
  );
}
