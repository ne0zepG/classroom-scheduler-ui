import { Routes } from '@angular/router';
import { HomePageComponent } from './components/home-page/home-page.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { AdminControlComponent } from './components/admin-control/admin-control.component';
import { RequestComponent } from './components/request/request.component';

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
    path: 'manage',
    component: ScheduleComponent,
    title: 'Manage Schedules',
  },
  { path: 'admin', component: AdminControlComponent, title: 'Admin Control' },
  {
    path: 'requests',
    component: RequestComponent,
    title: 'Manage Requests',
  },
  { path: '**', redirectTo: 'home' }, // Redirect any unknown paths to the home page
];
