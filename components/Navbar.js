'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { formatThaiDate } from '@/lib/periods'

export default function Navbar({ role, name }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b-2 border-gold px-4 sm:px-6 py-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold text-navy tracking-wide">FIN Infinity 928</span>
            <span className="text-gold text-xs hidden sm:inline">GROW TOGETHER · GO FURTHER</span>
          </div>
          <p className="text-xs text-gray-400">{formatThaiDate()}</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-sm flex-wrap">
          {role === 'leader' && (
            <>
              <a href="/admin" className="text-navy hover:text-gold font-medium">ภาพรวมทีม</a>
              <a href="/recruiting" className="text-navy hover:text-gold font-medium">Recruit</a>
              <a href="/campaigns" className="text-navy hover:text-gold font-medium">แคมเปญ</a>
              <a href="/goals" className="text-navy hover:text-gold font-medium">ตั้งเป้าหมาย</a>
            </>
          )}
          {role === 'agent' && (
            <>
              <a href="/dashboard" className="text-navy hover:text-gold font-medium">กรอกกิจกรรม</a>
              <a href="/recruiting" className="text-navy hover:text-gold font-medium">Recruit</a>
            </>
          )}
          <span className="text-gray-400 hidden sm:inline">{name}</span>
          <button onClick={handleLogout} className="bg-navy text-white px-3 py-1.5 rounded-lg font-semibold text-xs sm:text-sm hover:opacity-90">
            ออกจากระบบ
          </button>
        </div>
      </div>
    </nav>
  )
}
