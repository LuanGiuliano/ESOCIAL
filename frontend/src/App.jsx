import { Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import FormPage from './pages/FormPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/form" element={<FormPage />} />
    </Routes>
  )
}

export default App
