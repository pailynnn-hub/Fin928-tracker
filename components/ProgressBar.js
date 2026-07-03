export default function ProgressBar({ label, actual, target, isCurrency }) {
  const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : actual > 0 ? 100 : 0
  const gap = Math.max(0, target - actual)
  const color = pct >= 100 ? 'bg-green-500' : pct >= 60 ? 'bg-gold' : 'bg-red-400'
  const fmt = (n) => (isCurrency ? Number(n).toLocaleString('th-TH') : n)

  return (
    <div className="mb-4">
      <div className="flex justify-between items-baseline text-sm mb-1 flex-wrap gap-x-2">
        <span className="text-gray-700 font-medium">{label}</span>
        <span className="text-gray-500 text-xs sm:text-sm">
          {fmt(actual)} / {fmt(target)} {isCurrency ? 'บาท' : ''} ({pct}%)
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      {target > 0 && (
        <div className="mt-1 text-xs">
          {gap > 0 ? (
            <span className="text-red-500">
              ยังขาดอีก {fmt(gap)} {isCurrency ? 'บาท' : ''} ถึงจะถึงเป้า
            </span>
          ) : (
            <span className="text-green-600 font-medium">ถึงเป้าหมายแล้ว ✓</span>
          )}
        </div>
      )}
    </div>
  )
}
