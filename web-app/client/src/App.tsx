import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Layout } from '@/components/layout'
import { Dashboard } from '@/pages/dashboard'
import { BenchmarkPage } from '@/pages/benchmark'
import { ResultsPage } from '@/pages/results'
import { HistoryPage } from '@/pages/history'
import { SettingsPage } from '@/pages/settings'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="dns-bench-theme">
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/benchmark" element={<BenchmarkPage />} />
          <Route path="/results/:id" element={<ResultsPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App