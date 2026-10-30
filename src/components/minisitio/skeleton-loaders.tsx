/** Esqueletos de carga del minisitio (antes `components/SkeletonLoaders.js`). */
export const TableSkeleton = ({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) => (
  <div className="animate-pulse">
    {/* Header */}
    <div className="grid grid-cols-6 gap-4 p-4 bg-gray-50 border-b">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-200 rounded"></div>
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="grid grid-cols-6 gap-4 p-4 border-b">
        {Array.from({ length: cols }).map((_, colIndex) => (
          <div 
            key={colIndex} 
            className={`h-4 bg-gray-100 rounded ${
              colIndex === 0 ? 'bg-gray-200' : ''
            }`}
          ></div>
        ))}
      </div>
    ))}
  </div>
);

export const GroupSkeleton = ({ expandedCount = 0 }: { expandedCount?: number }) => (
  <div className="animate-pulse space-y-2">
    {/* Grupo principal */}
    <div className="flex items-center justify-between p-4 bg-gray-50 border rounded">
      <div className="flex items-center space-x-3">
        <div className="w-4 h-4 bg-gray-200 rounded"></div>
        <div className="h-5 bg-gray-300 rounded w-40"></div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="h-6 bg-gray-200 rounded w-20"></div>
        <div className="h-6 bg-blue-200 rounded w-24"></div>
      </div>
    </div>
    
    {/* Sub-elementos expandidos */}
    {Array.from({ length: expandedCount }).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-3 bg-gray-25 border-l-4 border-gray-200 ml-6">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-gray-200 rounded-full"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-16"></div>
      </div>
    ))}
  </div>
);

export const SummaryCardSkeleton = () => (
  <div className="animate-pulse">
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 bg-gray-200 rounded w-32"></div>
        <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-8 bg-gray-300 rounded w-28"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
    </div>
  </div>
);

export const FinancialReportSkeleton = () => (
  <div className="space-y-6">
    {/* Cards de resumen */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
      <SummaryCardSkeleton />
    </div>

    {/* Sección de Ingresos */}
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="h-7 bg-green-200 rounded w-40"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <GroupSkeleton />
          <GroupSkeleton />
        </div>
      </div>
    </div>

    {/* Sección de Egresos */}
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div className="h-7 bg-red-200 rounded w-40"></div>
          <div className="h-6 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          <GroupSkeleton expandedCount={3} />
          <GroupSkeleton />
          <GroupSkeleton expandedCount={2} />
        </div>
      </div>
    </div>
  </div>
);
