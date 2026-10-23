import Navbar from './Navbar'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-0)' }}>
      <Navbar />
      {/* --header-h tracks the navbar: 56px on mobile, 88px once the index ticker shows */}
      <main style={{ paddingTop: 'var(--header-h)' }}>{children}</main>
    </div>
  )
}
