'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { ACTIVITY_FIELDS, RECRUITING_FIELDS, toISODate } from '@/lib/periods'

const emptySales = ACTIVITY_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {})
const emptyRecruit = RECRUITING_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {})

export default function EditAgentPage() {
  const router = useRouter()
  const params = useParams()
  const agentId = params.agentId
  const supabase = createClient()

  const [profile, setProfile] = useState(null)
  const [targetAgent, setTargetAgent] = useState(null)
  const [date, setDate] = useState(toISODate(new Date()))
  const [tab, setTab] = useState('sales') // sales | recruiting
  const [salesForm, setSalesForm] = useState(emptySales)
  const [recruitForm, setRecruitForm] = useState(emptyRecruit)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadForDate = useCallback(async (d) => {
    const { data: salesRow } = await supabase
      .from('daily_activities').select('*').eq('agent_id', agentId).eq('activity_date', d).maybeSingle()
    const sf = { ...emptySales }
    if (salesRow) ACTIVITY_FIELDS.forEach((f) => (sf[f.key] = salesRow[f.key]))
    setSalesForm(sf)

    const { data: recruitRow } = await supabase
      .from('recruiting_activities').select('*').eq('agent_id', agentId).eq('activity_date', d).maybeSingle()
    const rf = { ...emptyRecruit }
    if (recruitRow) RECRUITING_FIELDS.forEach((f) => (rf[f.key] = recruitRow[f.key]))
    setRecruitForm(rf)
  }, [supabase, agentId])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (p?.role !== 'leader') { router.replace('/dashboard'); return }
      setProfile(p)

      const { data: ta } = await supabase.from('profiles').select('*').eq('id', agentId).single()
      setTargetAgent(ta)

      await loadForDate(date)
      setLoading(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, supabase, agentId])

  async function handleDateChange(d) {
    setDate(d)
    await loadForDate(d)
  }

  async function handleSaveSales(e) {
    e.preventDefault()
    setSaved(false)
    await supabase.from('daily_activities').upsert(
      { agent_id: agentId, activity_date: date, ...salesForm },
      { onConflict: 'agent_id,activity_date' }
    )
    setSaved(true)
  }

  async function handleSaveRecruit(e) {
    e.preventDefault()
    setSaved(false)
    await supabase.from('recruiting_activities').upsert(
      { agent_id: agentId, activity_date: date, ...recruitForm },
      { onConflict: 'agent_id,activity_date' }
    )
    setSaved(true)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>

  return (
    <div>
      <Navbar role="leader" name={profile?.full_name} />
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <a href="/admin" className="text-sm text-gray-400 hover:text-navy">← กลับไปภาพรวมทีม</a>
          <h1 className="text-xl font-bold text-navy mt-1">แก้ไขข้อมูลของ {targetAgent?.full_name}</h1>
          <p className="text-xs text-gray-500">หัวหน้าทีมกำลังกรอก/แก้ไขข้อมูลแทนตัวแทนคนนี้</p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-sm text-gray-600 block mb-1">เลือกวันที่</label>
            <input
              type="date" value={date}
              onChange={(e) => handleDateChange(e.target.value)}
              className="border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => setTab('sales')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'sales' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}
            >กิจกรรมขาย</button>
            <button
              onClick={() => setTab('recruiting')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${tab === 'recruiting' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}
            >กิจกรรม Recruit</button>
          </div>
        </div>

        {tab === 'sales' && (
          <form onSubmit={handleSaveSales} className="bg-white rounded-xl shadow p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ACTIVITY_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-gray-600">{f.label}</label>
                <input
                  type="number" min="0" step={f.isCurrency ? '0.01' : '1'}
                  value={salesForm[f.key]}
                  onChange={(e) => setSalesForm({ ...salesForm, [f.key]: Number(e.target.value) })}
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
        )}

        {tab === 'recruiting' && (
          <form onSubmit={handleSaveRecruit} className="bg-white rounded-xl shadow p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {RECRUITING_FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-sm text-gray-600">{f.label}</label>
                <input
                  type="number" min="0"
                  value={recruitForm[f.key]}
                  onChange={(e) => setRecruitForm({ ...recruitForm, [f.key]: Number(e.target.value) })}
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
        )}
      </main>
    </div>
  )
}
