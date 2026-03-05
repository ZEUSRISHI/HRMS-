import { X, LayoutDashboard, Clock, CheckSquare, FileText, Calendar, DollarSign, Building2, FolderKanban, UserPlus, Timer, BarChart3, Users, Shield } from "lucide-react"
import { Role } from "../app/contexts/AuthContext"
import { ModuleType } from "../app/App"

type Props = {
  active: ModuleType
  setActive: (module: ModuleType) => void
  role: Role
  open: boolean
  setOpen: (v:boolean)=>void
}

export default function Sidebar({
  active,
  setActive,
  role,
  open,
  setOpen
}: Props){

  const menu = [
    { id:"dashboard", name:"Dashboard", icon:LayoutDashboard, roles:["admin","manager","employee","hr"] },
    { id:"attendance", name:"Attendance", icon:Clock, roles:["admin","manager","employee","hr"] },
    { id:"tasks", name:"Tasks", icon:CheckSquare, roles:["admin","manager","employee","hr"] },
    { id:"employee-task-status", name:"My Tasks", icon:CheckSquare, roles:["employee"] },
    { id:"status", name:"Daily Status", icon:FileText, roles:["admin","manager","employee","hr"] },
    { id:"calendar", name:"Calendar", icon:Calendar, roles:["admin","manager","employee","hr"] },
    { id:"payroll", name:"Payroll", icon:DollarSign, roles:["admin","hr"] },
    { id:"clients", name:"Clients", icon:Building2, roles:["admin","manager"] },
    { id:"projects", name:"Projects", icon:FolderKanban, roles:["admin","manager","employee"] },
    { id:"onboarding", name:"Onboarding", icon:UserPlus, roles:["admin","hr"] },
    { id:"time-tracking", name:"Time Tracking", icon:Timer, roles:["admin","manager","employee"] },
    { id:"analytics", name:"Analytics", icon:BarChart3, roles:["admin","manager"] },
    { id:"hr-employees", name:"Employee Records", icon:Users, roles:["hr"] },
    { id:"admin-users", name:"User Management", icon:Shield, roles:["admin"] }
  ]

  const filtered = menu.filter(m => m.roles.includes(role))

  return(
    <>
    <aside className={`
      fixed md:static
      top-0 left-0
      h-full w-64
      bg-white border-r
      transform transition-transform
      ${open ? "translate-x-0":"-translate-x-full"}
      md:translate-x-0
      z-50
    `}>

      <div className="p-4">

        <div className="flex justify-between mb-6">

          <h2 className="font-bold text-lg">
            HRMS
          </h2>

          <button
            className="md:hidden"
            onClick={()=>setOpen(false)}
          >
            <X/>
          </button>

        </div>

        {filtered.map(item=>{

          const Icon = item.icon

          return(
            <button
              key={item.id}
              onClick={()=>{
                setActive(item.id as ModuleType)
                setOpen(false)
              }}
              className={`
                w-full flex items-center gap-3
                px-3 py-2 rounded-lg mb-2
                ${active===item.id
                  ? "bg-blue-100 text-blue-600"
                  : "hover:bg-gray-100"}
              `}
            >
              <Icon size={18}/>
              {item.name}
            </button>
          )
        })}

      </div>

    </aside>

    {open && (
      <div
        className="fixed inset-0 bg-black/40 md:hidden"
        onClick={()=>setOpen(false)}
      />
    )}

    </>
  )
}