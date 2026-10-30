/** Tarjeta con título del minisitio (antes `components/Card.js`). */
export function LegacyCard({
  title,
  children,
  className = "",
  headerAction = null,
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className={`bg-white rounded-xl shadow-soft border border-neutral-200 hover:shadow-medium transition-all duration-200 ${className}`}>
      {title && (
        <div className="px-6 py-4 border-b border-neutral-200 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-primary-800">{title}</h3>
          {headerAction}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

export default LegacyCard;
