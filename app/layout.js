import './globals.css'

export const metadata = {
  title: 'FIN 928 Activity Tracker',
  description: 'ระบบติดตามกิจกรรมตัวแทนประกัน FIN 928',
}

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body className="bg-cream text-navy min-h-screen">{children}</body>
    </html>
  )
}
