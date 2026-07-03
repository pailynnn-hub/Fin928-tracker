'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { ACTIVITY_FIELDS, RECRUITING_FIELDS, getPeriodRange, toISODate, PERIOD_LABELS } from '@/lib/periods'

const emptySalesTargets = ACTIVITY_FIELDS.reduce((acc, f) => ({ ...acc, [`target_${f.key}`]: 0 }), {})
const emptyRecruitTargets = RECRUITING_FIELDS.reduce((acc, f) => ({ ...acc, [`target_${f.key}`]: 0 }), {})

export default function GoalsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [goalType, setGoalType] = useState('sales') // 'sales' | 'recruiting'
  const [agents, setAgents] = useState([])       // สำหรับ tab ขาย (เฉพาะ agent)
  const [allPeople, setAllPeople] = useState([])  // สำหรับ tab recruit (agent + leader)
  const [periodType, setPeriodType] = useState('month')
  const [targetAgentId, setTargetAgentId] = useState('TEAM')
  const [form, setForm] = useState(emptySalesTargets)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const fields = goalType === 'sales' ? ACTIVITY_FIELDS : RECRUITING_FIELDS
  const tableName = goalType === 'sales' ? 'goals' : 'recruiting_goals'
  const emptyTargets = goalType === 'sales' ? emptySalesTargets : emptyRecruitTargets

  const loadExisting = useCallback(async (type, agentId, gType) => {
    const { start, end } = getPeriodRange(type)
    const table = gType === 'sales' ? 'goals' : 'recruiting_goals'
    let query = supabase.from(table).select('*')
      .eq('period_type', type)
      .lte('period_start', toISODate(end)).gte('period_end', toISODate(start))
    query = agentId === 'TEAM' ? query.is('agent_id', null) : query.eq('agent_id', agentId)
    const { data } = await query.maybeSingle()

    const empty = gType === 'sales' ? emptySalesTargets : emptyRecruitTargets
    const flds = gType === 'sales' ? ACTIVITY_FIELDS : RECRUITING_FIELDS
    if (data) {
      const f = { ...empty }
      flds.forEach((field) => (f[`target_${field.key}`] = data[`target_${field.key}`]))
      setForm(f)
    } else {
      setForm(empty)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (p?.role !== 'leader') { router.replace('/dashboard'); return }
      setProfile(p)
      const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
      setAgents((profiles || []).filter((x) => x.role === 'agent'))
      setAllPeople(profiles || [])
      await loadExisting('month', 'TEAM', 'sales')
      setLoading(false)
    })
  }, [router, supabase, loadExisting])

  async function handleGoalTypeChange(gType) {
    setGoalType(gType)
    setTargetAgentId('TEAM')
    await loadExisting(periodType, 'TEAM', gType)
  }

  async function handleFilterChange(type, agentId) {
    setPeriodType(type)
    setTargetAgentId(agentId)
    await loadExisting(type, agentId, goalType)
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaved(false)
    const { start, end } = getPeriodRange(periodType)
    const payload = {
      agent_id: targetAgentId === 'TEAM' ? null : targetAgentId,
      period_type: periodType,
      period_start: toISODate(start),
      period_end: toISODate(end),
      ...form,
    }
    let delQuery = supabase.from(tableName).delete().eq('period_type', periodType).eq('period_start', toISODate(start))
    delQuery = targetAgentId === 'TEAM' ? delQuery.is('agent_id', null) : delQuery.eq('agent_id', targetAgentId)
    await delQuery
    await supabase.from(tableName).insert(payload)
    setSaved(true)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>

  const peopleList = goalType === 'sales' ? agents : allPeople

  return (
    <div>
      <Navbar role="leader" name={profile?.full_name} />
      <main className="max-w-2xl mx-auto p-4 sm:p-6">
        <h1 className="text-xl font-bold text-navy mb-4">ตั้งเป้าหมาย</h1>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => handleGoalTypeChange('sales')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${goalType === 'sales' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}
          >เป้าหมายกิจกรรมขาย</button>
          <button
            onClick={() => handleGoalTypeChange('recruiting')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold ${goalType === 'recruiting' ? 'bg-navy text-white' : 'bg-gray-100 text-gray-600'}`}
          >เป้าหมาย Recruit</button>
        </div>

        <div className="bg-white rounded-xl shadow p-6 mb-6 flex gap-4 flex-wrap">
          <div>
            <label className="text-sm text-gray-600 block mb-1">ช่วงเวลา</label>
            <select
              value={periodType}
              onChange={(e) => handleFilterChange(e.target.value, targetAgentId)}
              className="border rounded-lg px-3 py-2"
            >
              {Object.entries(PERIOD_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-600 block mb-1">ตั้งเป้าให้</label>
            <select
              value={targetAgentId}
              onChange={(e) => handleFilterChange(periodType, e.target.value)}
              className="border rounded-lg px-3 py-2"
            >
              <option value="TEAM">ทีมรวม (ทุกคน)</option>
              {peopleList.map((a) => (
                <option key={a.id} value={a.id}>{a.full_name}{a.role === 'leader' ? ' (หัวหน้าทีม)' : ''}</option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleSave} className="bg-white rounded-xl shadow p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map((f) => (
            <div key={f.key}>
              <label className="text-sm text-gray-600">{f.label}</label>
              <input
                type="number" min="0" step={f.isCurrency ? '0.01' : '1'}
                value={form[`target_${f.key}`]}
                onChange={(e) => setForm({ ...form, [`target_${f.key}`]: Number(e.target.value) })}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
          ))}
          <div className="sm:col-span-2">
            <button type="submit" className="bg-navy text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90">
              บันทึกเป้าหมาย
            </button>
            {saved && <span className="text-green-600 text-sm ml-3">บันทึกสำเร็จ ✓</span>}
          </div>
        </form>
      </main>
    </div>
  )
}
