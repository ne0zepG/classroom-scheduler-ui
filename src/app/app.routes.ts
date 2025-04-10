import { Routes } from '@angular/router';
import { HomePageComponent } from './components/home-page/home-page.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { StatisticsComponent } from './components/statistics/statistics.component';
import { AdminControlComponent } from './components/admin-control/admin-control.component';

export const routes: Routes = [
  {
    path: '',
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
    title: 'Manage Classroom Schedules',
  },

  { path: 'admin', component: AdminControlComponent, title: 'Admin Control' },
  { path: '**', redirectTo: '' }, // Redirect any unknown paths to the home page
];
