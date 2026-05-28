import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-0)' }}>
      <Navbar />
      <main className="pt-[60px]">{children}</main>
    </div>
  )
}
