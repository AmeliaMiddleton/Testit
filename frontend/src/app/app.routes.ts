import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'menu', pathMatch: 'full' },
  { path: 'login', loadComponent: () => import('./features/auth/auth.component').then(m => m.AuthComponent) },
  { path: 'reset-password', loadComponent: () => import('./features/reset-password/reset-password.component').then(m => m.ResetPasswordComponent) },
  { path: 'menu', loadComponent: () => import('./features/menu/menu.component').then(m => m.MenuComponent), canActivate: [authGuard] },
  { path: 'levels', loadComponent: () => import('./features/level-select/level-select.component').then(m => m.LevelSelectComponent), canActivate: [authGuard] },
  { path: 'game/:id', loadComponent: () => import('./features/game/game.component').then(m => m.GameComponent), canActivate: [authGuard] },
  { path: 'shop', loadComponent: () => import('./features/shop/shop.component').then(m => m.ShopComponent), canActivate: [authGuard] },
  { path: 'league', loadComponent: () => import('./features/league/league.component').then(m => m.LeagueComponent), canActivate: [authGuard] },
  { path: '**', redirectTo: 'menu' }
];
