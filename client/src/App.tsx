import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<div>Baawa Mehram</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
