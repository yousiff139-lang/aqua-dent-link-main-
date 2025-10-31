import { Link, useLocation } from 'react-router-dom'
import { Home, Users, Calendar, User, UserPlus, Settings, LogOut, Code } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isAdminEmail } from '@/lib/auth'

export function Sidebar() {
  const location = useLocation()
  const { user, signOut } = useAuth()
  const isAdmin = user && isAdminEmail(user.email)

  const navItems = [
    { path: '/dashboard', icon: Home, label: 'Dashboard' },
    { path: '/patients', icon: Users, label: 'My Patients' },
    { path: '/appointments', icon: Calendar, label: 'Appointments' },
    { path: '/profile', icon: User, label: 'My Profile' },
    ...(isAdmin ? [{ path: '/doctors', icon: Users, label: 'All Doctors' }] : []),
    ...(isAdmin ? [{ path: '/add-doctor', icon: UserPlus, label: 'Add Doctor' }] : []),
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/developers', icon: Code, label: 'Developers' },
  ]

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="w-20 bg-gradient-to-b from-blue-50 to-white border-r border-blue-100 flex flex-col items-center py-6 space-y-4">
      {/* Logo */}
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-8 shadow-lg">
        <span className="text-white font-bold text-xl">D</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col items-center space-y-2 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 group relative ${
                active
                  ? 'bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-200'
                  : 'bg-white hover:bg-blue-50 border border-blue-100'
              }`}
              title={item.label}
            >
              <Icon className={`w-6 h-6 ${active ? 'text-white' : 'text-blue-600'}`} />
              
              {/* Tooltip */}
              <span className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Sign Out */}
      <button
        onClick={signOut}
        className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white hover:bg-red-50 border border-blue-100 transition-all duration-200 group relative"
        title="Sign Out"
      >
        <LogOut className="w-6 h-6 text-red-500" />
        
        {/* Tooltip */}
        <span className="absolute left-full ml-4 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          Sign Out
        </span>
      </button>
    </div>
  )
}
