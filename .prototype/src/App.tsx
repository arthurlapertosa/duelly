import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useStore } from './store/useStore'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Onboarding } from './screens/Onboarding'
import { Home } from './screens/Home'
import { Deposit } from './screens/Deposit'
import { Templates } from './screens/Templates'
import { TemplateDetail } from './screens/TemplateDetail'
import { CreateInvite } from './screens/CreateInvite'
import { AcceptInvite } from './screens/AcceptInvite'
import { BetDetail } from './screens/BetDetail'
import { BetsList } from './screens/BetsList'
import { Activity } from './screens/Activity'
import { Withdraw } from './screens/Withdraw'

function App() {
  const isLoggedIn = useStore((s) => s.isLoggedIn)

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={isLoggedIn ? <Navigate to="/home" replace /> : <Onboarding />}
        />
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/deposit" element={<ProtectedRoute><Deposit /></ProtectedRoute>} />
        <Route path="/withdraw" element={<ProtectedRoute><Withdraw /></ProtectedRoute>} />
        <Route path="/templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
        <Route path="/templates/:id" element={<ProtectedRoute><TemplateDetail /></ProtectedRoute>} />
        <Route path="/create-invite" element={<ProtectedRoute><CreateInvite /></ProtectedRoute>} />
        <Route path="/invite/:id" element={<ProtectedRoute><AcceptInvite /></ProtectedRoute>} />
        <Route path="/bets" element={<ProtectedRoute><BetsList /></ProtectedRoute>} />
        <Route path="/bets/:id" element={<ProtectedRoute><BetDetail /></ProtectedRoute>} />
        <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
