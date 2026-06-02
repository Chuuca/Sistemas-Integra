import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { OperationDashboardComponent } from './features/dashboard/operation-dashboard/operation-dashboard.component';
import { AdminDashboardComponent } from './features/dashboard/admin-dashboard/admin-dashboard.component';
import { UserDashboardComponent } from './features/dashboard/user-dashboard/user-dashboard.component';
import { UpcomingServicesComponent } from './features/schedule/upcoming-services/upcoming-services.component';
import { ReportsComponent } from './features/reports/reports/reports.component';
import { TaskDetailComponent } from './features/tasks/task-detail/task-detail.component';
import { WorkOrderComponent } from './features/tasks/work-order/work-order.component';
export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/user-dashboard/user-dashboard.component').then(m => m.UserDashboardComponent),
    canActivate: [authGuard]
  },
  {
   path: 'operation',
  component: OperationDashboardComponent,
  canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/dashboard/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'admin/users',
    loadComponent: () =>
      import('./features/admin/users/users.component').then(m => m.UsersComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'tasks/:id',
    loadComponent: () =>
      import('./features/tasks/task-detail/task-detail.component').then(m => m.TaskDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'schedule',
    loadComponent: () =>
      import('./features/schedule/upcoming-services/upcoming-services.component').then(m => m.UpcomingServicesComponent),
    canActivate: [authGuard]
  },
  {
  path: 'tasks/:id/work-order',
  component: WorkOrderComponent,
  canActivate: [authGuard]
},
  {
    path: 'reports',
    loadComponent: () =>
      import('./features/reports/reports/reports.component').then(m => m.ReportsComponent),
    canActivate: [authGuard]
  },
  { path: '**', redirectTo: 'login' }
];