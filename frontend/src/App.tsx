import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Journal from './pages/Journal'
import Stats from './pages/Stats'
import Scanner from './pages/Scanner'
import Watchlist from './pages/Watchlist'
import PatternLibrary from './pages/PatternLibrary'
import PairTracker from './pages/PairTracker'
import Funding from './pages/Funding'
import Psychology from './pages/Psychology'
import Review from './pages/Review'
import Market from './pages/Market'
import Alerts from './pages/Alerts'
import Vaults from './pages/Vaults'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/journal" replace />} />
          <Route path="journal" element={<Journal />} />
          <Route path="stats" element={<Stats />} />
          <Route path="scanner" element={<Scanner />} />
          <Route path="watchlist" element={<Watchlist />} />
          <Route path="patterns" element={<PatternLibrary />} />
          <Route path="pairs" element={<PairTracker />} />
          <Route path="funding" element={<Funding />} />
          <Route path="psychology" element={<Psychology />} />
          <Route path="review" element={<Review />} />
          <Route path="market" element={<Market />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="vaults" element={<Vaults />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
