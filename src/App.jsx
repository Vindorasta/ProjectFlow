import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Projects from './pages/Projects.jsx'
import Tasks from './pages/Tasks.jsx'
import GanttChart from './pages/GanttChart.jsx'
import NetworkDiagram from './pages/NetworkDiagram.jsx'
import CriticalPath from './pages/CriticalPath.jsx'
import Dependencies from './pages/Dependencies.jsx'
import Resources from './pages/Resources.jsx'
import WorkCalendar from './pages/WorkCalendar.jsx'
import NotFound from './pages/NotFound.jsx'
import './App.css'
import './features.css'

// Struktur rute ProjectFlow. Semua halaman sudah terimplementasi penuh dan
// terhubung ke navigasi sidebar.
export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="gantt" element={<GanttChart />} />
        <Route path="network" element={<NetworkDiagram />} />
        <Route path="critical-path" element={<CriticalPath />} />
        <Route path="dependencies" element={<Dependencies />} />
        <Route path="resources" element={<Resources />} />
        <Route path="calendar" element={<WorkCalendar />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
