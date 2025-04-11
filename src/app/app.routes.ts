import { Routes } from '@angular/router';
import { AdminControlComponent } from './components/admin-control/admin-control.component';
import { HomePageComponent } from './components/home-page/home-page.component';
import { ManageRequestComponent } from './components/manage-request/manage-request.component';
import { ManageScheduleComponent } from './components/manage-schedule/manage-schedule.component';
import { StatisticsComponent } from './components/statistics/statistics.component';

export const routes: Routes = [
  {
    path: 'home',
    component: HomePageComponent,
    title: 'Home',
  },
  {
    path: 'statistics',
    component: StatisticsComponent,
    title: 'Classroom Statistics',
  },
  {
    path: 'manage-schedules',
    component: ManageScheduleComponent,
    title: 'Manage Schedules',
  },
  { path: 'admin', component: AdminControlComponent, title: 'Admin Control' },
  {
    path: 'manage-requests',
    component: ManageRequestComponent,
    title: 'Manage Requests',
  },
  { path: '**', redirectTo: 'home' }, // Redirect any unknown paths to the home page
];
