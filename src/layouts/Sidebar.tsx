import { useState } from "react"
import { useAuth } from "../app/contexts/AuthContext"
import { roleModules } from "../config/roleModules"

import {
  LayoutDashboard,
  Users,
  UserCog,
  FolderKanban,
  CheckSquare,
  Calendar,
  Clock,
  TrendingUp,
  Bell,
  Settings,
  Menu,
  X
} from "lucide-react"

const menuItems = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "workforce", label: "Workforce", icon: Users },
  { key: "user-management", label: "User Management", icon: UserCog },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "attendance", label: "Attendance", icon: Calendar },
  { key: "timesheet", label: "Timesheet", icon: Clock },
  { key: "performance", label: "Performance", icon: TrendingUp },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings }
]

export default function Sidebar() {

  const { currentUser } = useAuth()

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [active, setActive] = useState("dashboard")

  const allowedModules =
    currentUser?.role ? roleModules[currentUser.role] : []

  const filteredMenu = menuItems.filter(item =>
    allowedModules.includes(item.key)
  )

  return (
    <div className="flex">

      {/* MOBILE HEADER */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 flex items-center justify-between px-4 bg-white shadow z-40">

        <button onClick={() => setMobileOpen(true)}>
          <Menu size={24}/>
        </button>

        <h1 className="font-semibold text-lg">
          HRMS
        </h1>

      </div>

      {/* OVERLAY */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
        fixed lg:static
        top-0 left-0
        h-screen
        bg-white border-r shadow
        transition-all duration-300
        z-50
        flex flex-col

        ${collapsed ? "lg:w-20" : "lg:w-64"}
        w-64

        ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
        lg:translate-x-0
        `}
      >

        {/* HEADER */}
        <div className="flex items-center justify-between p-4 border-b">

          {!collapsed && (
            <h2 className="text-lg font-bold">
              HRMS
            </h2>
          )}

          <button
            onClick={() => {
              if (window.innerWidth < 1024) {
                setMobileOpen(false)
              } else {
                setCollapsed(!collapsed)
              }
            }}
          >
            {collapsed ? <Menu size={22}/> : <X size={22}/>}
          </button>

        </div>

        {/* SCROLLABLE MENU */}
        <div
          className="
          flex-1
          overflow-y-auto
          overscroll-contain
          px-2
          py-4
          "
        >

          {filteredMenu.map(item => {

            const Icon = item.icon

            return (
              <button
                key={item.key}
                onClick={() => {
                  setActive(item.key)
                  setMobileOpen(false)
                }}
                className={`
                w-full flex items-center gap-3 p-3 rounded-lg mb-2 transition

                ${active === item.key
                  ? "bg-blue-600 text-white"
                  : "hover:bg-gray-100"}
                `}
              >

                <Icon size={20}/>

                {!collapsed && (
                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                )}

              </button>
            )

          })}

        </div>

      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 mt-14 lg:mt-0 p-4">

        {/* PAGE CONTENT */}

      </main>

    </div>
  )
}