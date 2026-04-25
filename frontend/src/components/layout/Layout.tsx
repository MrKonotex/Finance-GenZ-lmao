import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useWebSocket } from '../../hooks/useWebSocket'

export default function Layout() {
  useWebSocket()

  return (
    <div className="flex h-full bg-base">
      <Sidebar />
      <div className="flex flex-col flex-1 ml-[220px] min-h-full">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
