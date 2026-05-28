import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AppProvider } from './context/AppContext'
import Layout from './components/Layout'
import Sidebar from './components/Sidebar'
import Landing from './pages/Landing'
import Markets from './pages/Markets'
import StockDetail from './pages/StockDetail'
import News from './pages/News'
import Portfolio from './pages/Portfolio'
import AIAlerts from './pages/AIAlerts'
import Watchlist from './pages/Watchlist'
import Compare from './pages/Compare'
import Simulator from './pages/Simulator'
import MyanmarStocks from './pages/MyanmarStocks'
import MyanmarStockDetail from './pages/MyanmarStockDetail'
import GlobalMarkets from './pages/GlobalMarkets'

const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0,  transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div key={location.pathname} variants={pageVariants} initial="initial" animate="animate" exit="exit">
        <Routes location={location}>
          <Route path="/"           element={<Landing />} />
          <Route path="/markets"    element={<Markets />} />
          <Route path="/stock/:symbol" element={<StockDetail />} />
          <Route path="/news"       element={<News />} />
          <Route path="/portfolio"  element={<Portfolio />} />
          <Route path="/ai-alerts"  element={<AIAlerts />} />
          <Route path="/watchlist"  element={<Watchlist />} />
          <Route path="/compare"    element={<Compare />} />
          <Route path="/simulator"          element={<Simulator />} />
          <Route path="/global-markets"      element={<GlobalMarkets />} />
          <Route path="/myanmar-stocks"     element={<Navigate to="/global-markets?region=myanmar" replace />} />
          <Route path="/myanmar-stocks/:code" element={<MyanmarStockDetail />} />
          <Route path="*"                   element={<Navigate to="/" replace />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Layout>
          <Sidebar />
          <AnimatedRoutes />
        </Layout>
      </BrowserRouter>
    </AppProvider>
  )
}
