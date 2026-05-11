import { ExternalLink } from "lucide-react";

interface ExternalLinkButtonProps {
  href: string;
  label?: string;
}

/**
 * Standard external link button used in table rows.
 * Dark brand-deep bg, white text, rounded-full, opens in new tab.
 */
export function ExternalLinkButton({ href, label = "Ver" }: ExternalLinkButtonProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-brand-deep text-white text-[10px] font-bold uppercase tracking-tight shadow-md shadow-brand-deep/25 hover:bg-brand transition-colors"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  );
}
