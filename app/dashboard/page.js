'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import ProgressBar from '@/components/ProgressBar'
import CampaignCountdown from '@/components/CampaignCountdown'
import { ACTIVITY_FIELDS, getPeriodRange, toISODate, PERIOD_LABELS } from '@/lib/periods'

const today = toISODate(new Date())
const emptyForm = ACTIVITY_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {})

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState(false)
  const [periodType, setPeriodType] = useState('month')
  const [actuals, setActuals] = useState(emptyForm)
  const [goal, setGoal] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProgress = useCallback(async (agentId, type) => {
    const { start, end } = getPeriodRange(type)
    const { data: activities } = await supabase
      .from('daily_activities')
      .select('*')
      .eq('agent_id', agentId)
      .gte('activity_date', toISODate(start))
      .lte('activity_date', toISODate(end))

    const sums = { ...emptyForm }
    ;(activities || []).forEach((row) => {
      ACTIVITY_FIELDS.forEach((f) => { sums[f.key] += Number(row[f.key]) || 0 })
    })
    setActuals(sums)

    const { data: goalRow } = await supabase
      .from('goals')
      .select('*')
      .eq('agent_id', agentId)
      .eq('period_type', type)
      .lte('period_start', toISODate(end))
      .gte('period_end', toISODate(start))
      .maybeSingle()
    setGoal(goalRow)
  }, [supabase])

  // โหลดแคมเปญที่ยังไม่หมดเขต (ของตัวเอง + ของทั้งทีม) พร้อมยอดจริงสะสมในช่วงแคมเปญนั้น
  const loadCampaigns = useCallback(async (agentId) => {
    const todayStr = toISODate(new Date())
    const { data: campRows } = await supabase
      .from('campaigns')
      .select('*')
      .or(`agent_id.eq.${agentId},agent_id.is.null`)
      .gte('end_date', todayStr)
      .order('end_date')

    const withActuals = await Promise.all(
      (campRows || []).map(async (camp) => {
        const { data: rows } = await supabase
          .from('daily_activities')
          .select('fyp_amount, fyc_amount, life_count')
          .eq('agent_id', agentId)
          .gte('activity_date', camp.start_date)
          .lte('activity_date', camp.end_date)
        const sums = { fyp_amount: 0, fyc_amount: 0, life_count: 0 }
        ;(rows || []).forEach((r) => {
          sums.fyp_amount += Number(r.fyp_amount) || 0
          sums.fyc_amount += Number(r.fyc_amount) || 0
          sums.life_count += Number(r.life_count) || 0
        })
        return { campaign: camp, actuals: sums }
      })
    )
    setCampaigns(withActuals)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)

      const { data: todayRow } = await supabase
        .from('daily_activities')
        .select('*')
        .eq('agent_id', session.user.id)
        .eq('activity_date', today)
        .maybeSingle()
      if (todayRow) {
        const f = { ...emptyForm }
        ACTIVITY_FIELDS.forEach((field) => (f[field.key] = todayRow[field.key]))
        setForm(f)
      }

      await loadProgress(session.user.id, 'month')
      await loadCampaigns(session.user.id)
      setLoading(false)
    })
  }, [router, supabase, loadProgress, loadCampaigns])

  async function handlePeriodChange(type) {
    setPeriodType(type)
    if (profile) await loadProgress(profile.id, type)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaved(false)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('daily_activities').upsert(
      { agent_id: session.user.id, activity_date: today, ...form },
      { onConflict: 'agent_id,activity_date' }
    )
    setSaved(true)
    await loadProgress(session.user.id, periodType)
    await loadCampaigns(session.user.id)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>

  return (
    <div>
      <Navbar role="agent" name={profile?.full_name} />
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">

        {campaigns.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-navy mb-3">🎯 แคมเปญ/การแข่งขันพิเศษ</h2>
            {campaigns.map(({ campaign, actuals: a }) => (
              <CampaignCountdown key={campaign.id} campaign={campaign} actuals={a} />
            ))}
          </section>
        )}

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-navy mb-4">กรอกกิจกรรมวันนี้ ({today})</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ACTIVITY_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-gray-600">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  step={f.isCurrency ? '0.01' : '1'}
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <button type="submit" className="bg-navy text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90">
                บันทึกข้อมูลวันนี้
              </button>
              {saved && <span className="text-green-600 text-sm ml-3">บันทึกสำเร็จ ✓</span>}
            </div>
          </form>
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-navy">ความคืบหน้าของฉัน</h2>
            <select
              value={periodType}
              onChange={(e) => handlePeriodChange(e.target.value)}
              className="border rounded-lg px-3 py-1 text-sm"
            >
              {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          {!goal && <p className="text-sm text-gray-500 mb-3">ยังไม่มีการตั้งเป้าหมายช่วงนี้ (ให้หัวหน้าทีมตั้งเป้าให้)</p>}
          {ACTIVITY_FIELDS.map((f) => (
            <ProgressBar
              key={f.key}
              label={f.label}
              actual={actuals[f.key]}
              target={goal ? goal[`target_${f.key}`] : 0}
              isCurrency={f.isCurrency}
            />
          ))}
        </section>
      </main>
    </div>
  )
}
