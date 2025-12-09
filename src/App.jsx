import React from 'react'
import { Route, Routes } from 'react-router-dom'
import SplashPage from './components/SplashPage'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import Crash from './components/Crash'


const App = () => {
  return (
    <Routes>
      <Route path="/" element={<SplashPage/>}/>
      <Route path="/login" element={<Login/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/>
      <Route path="*" element={<Crash/>}/>
    </Routes>
  )
}

export default App
