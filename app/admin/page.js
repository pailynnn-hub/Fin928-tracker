'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import ProgressBar from '@/components/ProgressBar'
import CampaignCountdown from '@/components/CampaignCountdown'
import { ACTIVITY_FIELDS, getPeriodRange, toISODate, PERIOD_LABELS } from '@/lib/periods'

const emptyForm = ACTIVITY_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: 0 }), {})

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [periodType, setPeriodType] = useState('month')
  const [agents, setAgents] = useState([])
  const [rows, setRows] = useState([])
  const [teamActual, setTeamActual] = useState(emptyForm)
  const [teamGoal, setTeamGoal] = useState(null)
  const [teamCampaigns, setTeamCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async (type) => {
    const { start, end } = getPeriodRange(type)
    const { data: profiles } = await supabase.from('profiles').select('*').order('full_name')
    const agentList = (profiles || []).filter((p) => p.role === 'agent')
    setAgents(agentList)

    const { data: activities } = await supabase
      .from('daily_activities').select('*')
      .gte('activity_date', toISODate(start)).lte('activity_date', toISODate(end))

    const { data: goals } = await supabase
      .from('goals').select('*').eq('period_type', type)
      .lte('period_start', toISODate(end)).gte('period_end', toISODate(start))

    const teamGoalRow = (goals || []).find((g) => g.agent_id === null) || null
    setTeamGoal(teamGoalRow)

    const teamSums = { ...emptyForm }
    const perAgent = agentList.map((agent) => {
      const agentRows = (activities || []).filter((a) => a.agent_id === agent.id)
      const sums = { ...emptyForm }
      agentRows.forEach((row) => {
        ACTIVITY_FIELDS.forEach((f) => {
          sums[f.key] += Number(row[f.key]) || 0
          teamSums[f.key] += Number(row[f.key]) || 0
        })
      })
      const agentGoal = (goals || []).find((g) => g.agent_id === agent.id) || null
      return { agent, sums, goal: agentGoal }
    })
    setRows(perAgent)
    setTeamActual(teamSums)

    // แคมเปญรวมทีม (agent_id เป็น null) ที่ยังไม่หมดเขต — แสดงยอดรวมทั้งทีม
    const todayStr = toISODate(new Date())
    const { data: camps } = await supabase
      .from('campaigns').select('*').is('agent_id', null).gte('end_date', todayStr).order('end_date')
    const campWithActuals = await Promise.all(
      (camps || []).map(async (camp) => {
        const { data: campRows } = await supabase
          .from('daily_activities').select('fyp_amount, fyc_amount, life_count')
          .gte('activity_date', camp.start_date).lte('activity_date', camp.end_date)
        const sums = { fyp_amount: 0, fyc_amount: 0, life_count: 0 }
        ;(campRows || []).forEach((r) => {
          sums.fyp_amount += Number(r.fyp_amount) || 0
          sums.fyc_amount += Number(r.fyc_amount) || 0
          sums.life_count += Number(r.life_count) || 0
        })
        return { campaign: camp, actuals: sums }
      })
    )
    setTeamCampaigns(campWithActuals)
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (p?.role !== 'leader') { router.replace('/dashboard'); return }
      setProfile(p)
      await loadData('month')
    })
  }, [router, supabase, loadData])

  async function handlePeriodChange(type) {
    setPeriodType(type)
    setLoading(true)
    await loadData(type)
  }

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>

  return (
    <div>
      <Navbar role="leader" name={profile?.full_name} />
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-xl font-bold text-navy">ภาพรวมทีม FIN Infinity 928 ({agents.length} คน)</h1>
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

        {teamCampaigns.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-navy mb-3">🎯 แคมเปญรวมทีมที่กำลังดำเนินอยู่</h2>
            {teamCampaigns.map(({ campaign, actuals }) => (
              <CampaignCountdown key={campaign.id} campaign={campaign} actuals={actuals} />
            ))}
          </section>
        )}

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-bold text-navy mb-4">ผลรวมทีมเทียบเป้าหมายทีม ({PERIOD_LABELS[periodType]})</h2>
          {!teamGoal && <p className="text-sm text-gray-500 mb-3">ยังไม่มีการตั้งเป้าหมายรวมทีมสำหรับช่วงนี้</p>}
          {ACTIVITY_FIELDS.map((f) => (
            <ProgressBar
              key={f.key} label={f.label} actual={teamActual[f.key]}
              target={teamGoal ? teamGoal[`target_${f.key}`] : 0} isCurrency={f.isCurrency}
            />
          ))}
        </section>

        <section className="bg-white rounded-xl shadow p-6 overflow-x-auto">
          <h2 className="text-lg font-bold text-navy mb-4">ผลงานรายบุคคล</h2>
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-4">ชื่อ</th>
                {ACTIVITY_FIELDS.map((f) => (
                  <th key={f.key} className="py-2 pr-4 whitespace-nowrap">{f.label}</th>
                ))}
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ agent, sums, goal }) => (
                <tr key={agent.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4 font-medium whitespace-nowrap">{agent.full_name}</td>
                  {ACTIVITY_FIELDS.map((f) => {
                    const actual = sums[f.key]
                    const target = goal ? goal[`target_${f.key}`] : 0
                    const pct = target > 0 ? Math.round((actual / target) * 100) : null
                    return (
                      <td key={f.key} className="py-2 pr-4 whitespace-nowrap">
                        {f.isCurrency ? actual.toLocaleString('th-TH') : actual}
                        {target > 0 && (
                          <span className={`ml-1 text-xs ${pct >= 100 ? 'text-green-600' : 'text-gray-400'}`}>({pct}%)</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="py-2 pr-4">
                    <a href={`/admin/edit/${agent.id}`} className="text-xs text-gold hover:underline font-semibold whitespace-nowrap">
                      แก้ไขข้อมูล
                    </a>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={ACTIVITY_FIELDS.length + 2} className="py-6 text-center text-gray-400">ยังไม่มีตัวแทนในระบบ</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  )
}
