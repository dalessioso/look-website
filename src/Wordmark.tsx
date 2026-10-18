export default function Wordmark() {
  return <a className="wordmark" href="/" aria-label="Look home">
    <svg viewBox="0 0 132 44" aria-hidden="true">
      <g className="wordmark-letters">
        <path d="M7 7V36H28" />
        <ellipse cx="48" cy="25" rx="13" ry="12" />
        <ellipse cx="81" cy="25" rx="13" ry="12" />
        <path d="M105 7V36M106 27L123 14M113 23L125 36" />
      </g>
      <g className="wordmark-eyes">
        <path d="M39 25Q48 16 57 25Q48 34 39 25ZM72 25Q81 16 90 25Q81 34 72 25Z" />
        <circle cx="49.5" cy="25" r="2.9" />
        <circle cx="82.5" cy="25" r="2.9" />
      </g>
    </svg>
  </a>;
}
