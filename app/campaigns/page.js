'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import Navbar from '@/components/Navbar'
import { CAMPAIGN_FIELDS, toISODate, daysRemaining } from '@/lib/periods'

const emptyForm = {
  title: '',
  description: '',
  agent_id: 'TEAM',
  start_date: toISODate(new Date()),
  end_date: toISODate(new Date()),
  target_fyp_amount: 0,
  target_fyc_amount: 0,
  target_life_count: 0,
}

export default function CampaignsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [profile, setProfile] = useState(null)
  const [agents, setAgents] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadCampaigns = useCallback(async () => {
    const { data } = await supabase.from('campaigns').select('*, profiles(full_name)').order('end_date')
    setCampaigns(data || [])
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (p?.role !== 'leader') { router.replace('/dashboard'); return }
      setProfile(p)
      const { data: agentList } = await supabase.from('profiles').select('*').eq('role', 'agent').order('full_name')
      setAgents(agentList || [])
      await loadCampaigns()
      setLoading(false)
    })
  }, [router, supabase, loadCampaigns])

  async function handleSave(e) {
    e.preventDefault()
    setSaved(false)
    const payload = {
      title: form.title,
      description: form.description,
      agent_id: form.agent_id === 'TEAM' ? null : form.agent_id,
      start_date: form.start_date,
      end_date: form.end_date,
      target_fyp_amount: form.target_fyp_amount,
      target_fyc_amount: form.target_fyc_amount,
      target_life_count: form.target_life_count,
    }
    await supabase.from('campaigns').insert(payload)
    setSaved(true)
    setForm(emptyForm)
    await loadCampaigns()
  }

  async function handleDelete(id) {
    if (!confirm('ลบแคมเปญนี้?')) return
    await supabase.from('campaigns').delete().eq('id', id)
    await loadCampaigns()
  }

  if (loading) return <div className="p-8 text-center text-gray-500">กำลังโหลด...</div>

  return (
    <div>
      <Navbar role="leader" name={profile?.full_name} />
      <main className="max-w-3xl mx-auto p-4 sm:p-6 space-y-8">
        <h1 className="text-xl font-bold text-navy">🎯 จัดการแคมเปญ/การแข่งขันพิเศษ</h1>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold text-navy mb-4">สร้างแคมเปญใหม่</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-sm text-gray-600">ชื่อแคมเปญ</label>
              <input
                type="text" required value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="เช่น แคมเปญเดือนกรกฎาคม 2569"
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">รายละเอียด (ถ้ามี)</label>
              <input
                type="text" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 mt-1 focus:outline-none focus:ring-2 focus:ring-gold"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-gray-600">สำหรับ</label>
                <select
                  value={form.agent_id}
                  onChange={(e) => setForm({ ...form, agent_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="TEAM">ทั้งทีม (ทุกคนมีเป้านี้)</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-600">วันเริ่ม</label>
                <input
                  type="date" required value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">วันหมดเขต</label>
                <input
                  type="date" required value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {CAMPAIGN_FIELDS.map((f) => (
                <div key={f.targetKey}>
                  <label className="text-sm text-gray-600">เป้า {f.label}</label>
                  <input
                    type="number" min="0" step={f.isCurrency ? '0.01' : '1'}
                    value={form[f.targetKey]}
                    onChange={(e) => setForm({ ...form, [f.targetKey]: Number(e.target.value) })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                  />
                </div>
              ))}
            </div>
            <button type="submit" className="bg-navy text-white px-6 py-2 rounded-lg font-semibold hover:opacity-90">
              สร้างแคมเปญ
            </button>
            {saved && <span className="text-green-600 text-sm ml-3">สร้างสำเร็จ ✓</span>}
          </form>
        </section>

        <section className="bg-white rounded-xl shadow p-6">
          <h2 className="font-bold text-navy mb-4">แคมเปญทั้งหมด</h2>
          <div className="space-y-3">
            {campaigns.map((c) => {
              const remaining = daysRemaining(c.end_date)
              return (
                <div key={c.id} className="border rounded-lg p-4 flex items-start justify-between flex-wrap gap-2">
                  <div>
                    <p className="font-semibold text-navy">{c.title}</p>
                    <p className="text-xs text-gray-500">
                      {c.profiles ? c.profiles.full_name : 'ทั้งทีม'} · {c.start_date} ถึง {c.end_date}
                    </p>
                    <p className="text-xs text-gray-400">
                      FYP {Number(c.target_fyp_amount).toLocaleString('th-TH')} · FYC {Number(c.target_fyc_amount).toLocaleString('th-TH')} · Life {c.target_life_count}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-bold ${remaining < 0 ? 'text-red-400' : 'text-navy'}`}>
                      {remaining < 0 ? 'หมดเขตแล้ว' : `เหลือ ${remaining} วัน`}
                    </span>
                    <br />
                    <button onClick={() => handleDelete(c.id)} className="text-xs text-red-500 hover:underline mt-1">ลบ</button>
                  </div>
                </div>
              )
            })}
            {campaigns.length === 0 && <p className="text-sm text-gray-400">ยังไม่มีแคมเปญ</p>}
          </div>
        </section>
      </main>
    </div>
  )
}
