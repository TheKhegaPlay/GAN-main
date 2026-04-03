import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login.component';
import { GanModelsComponent } from './pages/gan-models.component';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'gan-models',
    component: GanModelsComponent
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: '/login'
  }
];

