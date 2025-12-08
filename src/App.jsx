import React from 'react'
import { Route, Routes } from 'react-router-dom'
import SplashPage from './components/SplashPage'
import Login from './components/Login'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<SplashPage/>}/>
      <Route path="/login" element={<Login/>}/>
    </Routes>
  )
}

export default App
