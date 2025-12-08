import React from 'react'
import { Route, Routes } from 'react-router-dom'
import SplashPage from './components/SplashPage'

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<SplashPage/>}/>
    </Routes>
  )
}

export default App
