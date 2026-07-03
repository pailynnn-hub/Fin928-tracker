import { CAMPAIGN_FIELDS, daysRemaining } from '@/lib/periods'

// campaign: row จากตาราง campaigns
// actuals: { fyp_amount, fyc_amount, life_count } ที่ทำได้จริงในช่วง campaign.start_date - end_date
export default function CampaignCountdown({ campaign, actuals }) {
  const remaining = daysRemaining(campaign.end_date)
  const expired = remaining < 0
  const isToday = remaining === 0

  return (
    <div className="border border-gold/40 rounded-xl p-5 bg-white shadow-sm mb-4">
      <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="font-bold text-navy">{campaign.title}</h3>
          {campaign.description && <p className="text-xs text-gray-500 mt-0.5">{campaign.description}</p>}
        </div>
        <div className="text-right">
          {expired ? (
            <span className="text-red-500 font-bold text-sm">หมดเขตแล้ว</span>
          ) : (
            <div>
              <span className="text-3xl font-extrabold text-navy">{remaining}</span>
              <span className="text-sm text-gray-500 ml-1">{isToday ? 'วันนี้วันสุดท้าย' : 'วันที่เหลือ'}</span>
            </div>
          )}
          <p className="text-xs text-gray-400">หมดเขต {new Date(campaign.end_date).toLocaleDateString('th-TH')}</p>
        </div>
      </div>

      <div className="space-y-2">
        {CAMPAIGN_FIELDS.map((f) => {
          const target = campaign[f.targetKey] || 0
          if (target <= 0) return null
          const actual = actuals[f.key] || 0
          const gap = Math.max(0, target - actual)
          const pct = Math.min(100, Math.round((actual / target) * 100))
          const perDay = !expired && remaining > 0 ? gap / remaining : gap
          return (
            <div key={f.key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">{f.label}</span>
                <span className="text-gray-500">
                  {actual.toLocaleString('th-TH')} / {target.toLocaleString('th-TH')} {f.isCurrency ? 'บาท' : ''} ({pct}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${pct >= 100 ? 'bg-green-500' : 'bg-gold'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {gap > 0 && !expired && (
                <p className="text-xs text-red-500 mt-0.5">
                  ต้องทำอีก {gap.toLocaleString('th-TH')} {f.isCurrency ? 'บาท' : ''} — เฉลี่ยวันละ{' '}
                  {Math.ceil(perDay).toLocaleString('th-TH')} {f.isCurrency ? 'บาท' : ''}
                </p>
              )}
              {gap === 0 && <p className="text-xs text-green-600 mt-0.5">ถึงเป้าหมายแล้ว ✓</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
