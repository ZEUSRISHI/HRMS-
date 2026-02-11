# HR & Operations Management System

## Overview
A comprehensive web-based HR and Operations Management System with role-based access control for Admin, Manager, and Employee roles.

## Features

### 1. **Attendance Tracking System**
- Daily check-in and check-out functionality
- Attendance history with detailed reports
- Leave request management
- Holiday mapping
- Status tracking (Present, Absent, Leave, Holiday)

### 2. **Task Management**
- Create and assign tasks with different frequencies (Daily, Weekly, Monthly, One-time)
- Track task status (Pending, In Progress, Completed)
- Priority levels (Low, Medium, High)
- Due dates and comments system
- Filter tasks by assignee and status

### 3. **Daily Status Updates**
- Employees submit daily work status
- Track achievements, blockers, and next-day plans
- Manager comment and feedback system
- Status history tracking

### 4. **Calendar Management**
- Company events and meetings
- Holiday list management
- Personal and team calendars
- Event types: Meetings, Company Events, Holidays, Personal
- Location and attendee tracking

### 5. **Payroll & Payment Status**
- Employee salary tracking
- Payslip management
- Payment status (Processed/Pending)
- Salary breakdown (Basic, Allowances, Deductions)
- Payroll reports and export

### 6. **Client Payment Tracking**
- Client profile management
- Invoice management system
- Payment received/pending status
- Outstanding balance summary
- Payment history tracking

### 7. **Client & Project Status**
- Client profile management
- Project details and milestones
- Progress tracking with visual indicators
- Budget vs. Spent tracking
- Team member assignment
- Project status (Planning, In Progress, Completed, On Hold)

### 8. **Employee Onboarding & Offboarding**
- Onboarding workflow for new employees
- Task checklist management
- Document upload and tracking
- Offboarding process with clearance tracking
- Final settlement management

### 9. **Time Tracking System**
- Daily work hours logging
- Project-wise time tracking
- Category-based tracking (Project, Meeting, Admin, Other)
- Productivity reports
- Time utilization metrics

### 10. **Analytics & Reports**
- Attendance analytics and trends
- Task completion metrics
- Productivity analytics
- Financial reports (Payroll, Revenue)
- Project performance analytics
- Downloadable reports (Excel/PDF capability)

## Role-Based Access

### Admin Role
- Full access to all modules
- User management capabilities
- System configuration
- Financial data access
- Analytics and reporting

### Manager Role
- Team management
- Task assignment and tracking
- Attendance approval
- Project oversight
- Team performance analytics
- Client and project management

### Employee Role
- Personal attendance tracking
- Task management (assigned tasks)
- Daily status submission
- Time tracking
- Personal calendar
- Payroll information (own data)

## Getting Started

### Role Switching (Demo Mode)
This prototype includes a role switcher at the bottom of the sidebar to demonstrate different user perspectives:
- Click "Admin" to see full system capabilities
- Click "Manager" to see team management features
- Click "Employee" to see individual user features

### Navigation
- Use the sidebar menu to navigate between different modules
- Click the menu icon to collapse/expand the sidebar
- The dashboard provides an overview of all key metrics

## Technical Features

- **Responsive Design**: Works on desktop and mobile devices
- **Interactive Charts**: Real-time data visualization using Recharts
- **Modern UI**: Built with shadcn/ui components
- **Type Safety**: Full TypeScript implementation
- **Mock Data**: Includes comprehensive sample data for demonstration

## Module Access Matrix

| Module | Admin | Manager | Employee |
|--------|-------|---------|----------|
| Dashboard | ✓ | ✓ | ✓ |
| Attendance | ✓ | ✓ | ✓ |
| Tasks | ✓ | ✓ | ✓ |
| Daily Status | ✓ | ✓ | ✓ |
| Calendar | ✓ | ✓ | ✓ |
| Payroll | ✓ | ✓ | ✓ (limited) |
| Clients & Payments | ✓ | ✓ | ✗ |
| Projects | ✓ | ✓ | ✓ (limited) |
| Onboarding | ✓ | ✓ | ✗ |
| Time Tracking | ✓ | ✓ | ✓ |
| Analytics | ✓ | ✓ | ✗ |

## Future Enhancements

To make this a production-ready system, consider:

1. **Backend Integration**: Connect to a real database (PostgreSQL, MongoDB, etc.)
2. **Authentication**: Implement proper user authentication and session management
3. **Real-time Updates**: Add WebSocket support for live updates
4. **Email Notifications**: Send alerts for approvals, deadlines, etc.
5. **File Uploads**: Implement actual file storage for documents and payslips
6. **Export Functionality**: Generate actual Excel/PDF reports
7. **Advanced Permissions**: Fine-grained permission controls
8. **Audit Logs**: Track all system changes and user actions
9. **Multi-language Support**: Internationalization
10. **Mobile Apps**: Native iOS and Android applications

## Notes

- This is a frontend prototype with mock data
- All data is stored in-memory and will reset on page refresh
- For production use, implement a proper backend with secure data storage
- Ensure compliance with data protection regulations (GDPR, etc.) when handling employee data
