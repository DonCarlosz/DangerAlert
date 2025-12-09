import React from 'react'
import { Route, Routes } from 'react-router-dom'
import SplashPage from './components/SplashPage'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import NotFound from './components/Notfound'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<SplashPage/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/>
      <Route path="*" element={<NotFound/>}/>
    </Routes>
  )
}

export default App
