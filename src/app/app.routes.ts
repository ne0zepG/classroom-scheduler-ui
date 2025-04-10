import { Routes } from '@angular/router';
import { HomePageComponent } from './components/home-page/home-page.component';
import { ScheduleComponent } from './components/schedule/schedule.component';
import { StatisticsComponent } from './components/statistics/statistics.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'Home',
  },
  {
    path: 'manage',
    component: ScheduleComponent,
    title: 'Manage Classroom Schedules',
  },
  {
    path: 'statistics',
    component: StatisticsComponent,
    title: 'Classroom Statistics',
  },
  { path: '**', redirectTo: '' }, // Redirect any unknown paths to the home page
];
