export const roleModules: Record<string, string[]> = {
  admin: [
    "dashboard",
    "workforce",
    "user-management",
    "projects",
    "tasks",
    "attendance",
    "timesheet",
    "performance",
    "notifications",
    "settings"
  ],

  hr: [
    "dashboard",
    "workforce",
    "attendance",
    "leave",
    "performance",
    "notifications"
  ],

  manager: [
    "dashboard",
    "projects",
    "tasks",
    "team",
    "timesheet",
    "notifications"
  ],

  employee: [
    "dashboard",
    "tasks",
    "attendance",
    "timesheet",
    "leave",
    "notifications"
  ]
};