import { Routes } from '@angular/router';
import { Lista } from './pages/lista/lista';

export const routes: Routes = [
  { path: '', component: Lista },           // Ruta principal
  { path: 'contactos', component: Lista },  // Ruta alternativa
  { path: '**', redirectTo: '' } ,
];