'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import ProgressBar from '@/components/ProgressBar'
import { RECRUITING_FIELDS, getPeriodRange, toISODate, PERIOD_LABELS } from '@/lib/periods'

const today = toISODate(new Date())
const emptyForm = RECRUITING_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {})

export default function RecruitingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState(false)
  const [periodType, setPeriodType] = useState('month')
  const [actuals, setActuals] = useState(emptyForm)
  const [goal, setGoal] = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  const loadOwnProgress = useCallback(async (userId, type) => {
    const { start, end } = getPeriodRange(type)
    const { data: rows } = await supabase
      .from('recruiting_activities')
      .select('*')
      .eq('agent_id', userId)
      .gte('activity_date', toISODate(start))
      .lte('activity_date', toISODate(end))
    const sums = { ...emptyForm }
    ;(rows || []).forEach((r) => RECRUITING_FIELDS.forEach((f) => { sums[f.key] += Number(r[f.key]) || 0 }))
    setActuals(sums)

    const { data: goalRow } = await supabase
      .from('recruiting_goals')
      .select('*')
      .eq('agent_id', userId)
      .eq('period_type', type)
      .lte('period_start', toISODate(end))
      .gte('period_end', toISODate(start))
      .maybeSingle()
    setGoal(goalRow)
  }, [supabase])

  const loadLeaderboard = useCallback(async (type) => {
    const { start, end } = getPeriodRange(type)
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
    const { data: rows } = await supabase
      .from('recruiting_activities')
      .select('*')
      .gte('activity_date', toISODate(start))
      .lte('activity_date', toISODate(end))

    const board = (profiles || []).map((person) => {
      const personRows = (rows || []).filter((r) => r.agent_id === person.id)
      const sums = { ...emptyForm }
      personRows.forEach((r) => RECRUITING_FIELDS.forEach((f) => { sums[f.key] += Number(r[f.key]) || 0 }))
      return { person, sums }
    })
    board.sort((a, b) => b.sums.codes_issued - a.sums.codes_issued || b.sums.career_pitch - a.sums.career_pitch)
    setLeaderboard(board)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      setProfile(p)

      const { data: todayRow } = await supabase
        .from('recruiting_activities')
        .select('*')
        .eq('agent_id', session.user.id)
        .eq('activity_date', today)
        .maybeSingle()
      if (todayRow) {
        const f = { ...emptyForm }
        RECRUITING_FIELDS.forEach((field) => (f[field.key] = todayRow[field.key]))
        setForm(f)
      }

      await loadOwnProgress(session.user.id, 'month')
      await loadLeaderboard('month')
      setLoading(false)
    })
  }, [router, supabase, loadOwnProgress, loadLeaderboard])

  async function handlePeriodChange(type) {
    setPeriodType(type)
    if (profile) {
      await loadOwnProgress(profile.id, type)
      await loadLeaderboard(type)
    }
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaved(false)
    const { data: { session } } = await supabase.auth.getSession()
    await supabase.from('recruiting_activities').upsert(
      { agent_id: session.user.id, activity_date: today, ...form },
      { onConflict: 'agent_id,activity_date' }
    )
    setSaved(true)
    await loadOwnProgress(session.user.id, periodType)
    await loadLeaderboard(periodType)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>

  return (
    <div>
      <Navbar role={profile?.role} name={profile?.full_name} />
      <main className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold text-navy">🏆 Recruiting Challenge</h1>
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

        {/* ฟอร์มกรอกกิจกรรมวันนี้ - ทุกคนกรอกของตัวเอง รวมถึงหัวหน้าทีม */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-navy mb-4">กิจกรรม Recruit วันนี้ ({today})</h2>
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RECRUITING_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-gray-600">{f.label}</label>
                <input
                  type="number"
                  min="0"
                  value={form[f.key]}
                  onChange={(e) => setForm({ ...form, [f.key]: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gold"
                />
              </div>
            ))}
            <div className="sm:col-span-2">
              <button type="submit" className="bg-navy text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90">
                บันทึก
              </button>
              {saved && <span className="text-green-600 text-sm ml-3">บันทึกสำเร็จ ✓</span>}
            </div>
          </form>
        </section>

        {/* ความคืบหน้าส่วนตัวเทียบเป้า */}
        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-navy mb-4">ความคืบหน้าของฉัน ({PERIOD_LABELS[periodType]})</h2>
          {!goal && <p className="text-sm text-gray-500 mb-3">ยังไม่มีการตั้งเป้าหมายช่วงนี้</p>}
          {RECRUITING_FIELDS.map((f) => (
            <ProgressBar
              key={f.key}
              label={f.label}
              actual={actuals[f.key]}
              target={goal ? goal[`target_${f.key}`] : 0}
            />
          ))}
        </section>

        {/* กระดานอันดับ - ทุกคนเห็นได้ทั้งหัวหน้าและตัวแทน */}
        <section className="bg-white rounded-xl shadow p-6 overflow-x-auto">
          <h2 className="text-lg font-bold text-navy mb-4">อันดับการแข่งขัน ({PERIOD_LABELS[periodType]})</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3">อันดับ</th>
                <th className="py-2 pr-4">ชื่อ</th>
                {RECRUITING_FIELDS.map((f) => (
                  <th key={f.key} className="py-2 pr-4 whitespace-nowrap">{f.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaderboard.map(({ person, sums }, idx) => (
                <tr key={person.id} className={`border-b hover:bg-gray-50 ${person.id === profile?.id ? 'bg-cream' : ''}`}>
                  <td className="py-2 pr-3 font-bold text-gold">{idx + 1}</td>
                  <td className="py-2 pr-4 font-medium">
                    {person.full_name} {person.role === 'leader' && <span className="text-xs text-gold ml-1">(หัวหน้าทีม)</span>}
                  </td>
                  {RECRUITING_FIELDS.map((f) => (
                    <td key={f.key} className="py-2 pr-4">{sums[f.key]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}
