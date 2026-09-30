import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { ParticipantProvider } from './context/ParticipantContext'
import { ToastProvider } from './components/Toast'
import './styles.css'
import './portal.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <ParticipantProvider>
            <App />
            <Analytics />
          </ParticipantProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
