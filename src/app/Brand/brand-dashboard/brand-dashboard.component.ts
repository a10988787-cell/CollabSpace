// src/app/Brand/brand-dashboard/brand-dashboard.component.ts
import { Component, OnInit, OnDestroy, ViewEncapsulation } from '@angular/core';
import { CommonModule }  from '@angular/common';
import { FormsModule }   from '@angular/forms';
import {
  Router, RouterOutlet, RouterLink, RouterLinkActive,
  NavigationEnd,
}                        from '@angular/router';
import { filter }        from 'rxjs/operators';
import { Subscription }  from 'rxjs';
import { AuthService, User } from '../../services/auth.service';

/**
 * BrandDashboardComponent — shell with sidebar + topbar.
 *
 * When the URL is exactly /dashboard/brand (overview), the router-outlet
 * renders nothing (empty path child). The overview content is injected
 * directly into this template via *ngIf="isOverview" — this avoids needing
 * a separate BrandOverviewComponent import which caused TS-998113 warnings
 * in Angular's template compiler.
 *
 * All other routes render their own child component inside <router-outlet>.
 */
@Component({
  selector: 'app-brand-dashboard',
  standalone: true,
  imports: [
    CommonModule,       // *ngIf, *ngFor, | number, | date
    FormsModule,        // [(ngModel)] on the search input
    RouterLink,         // routerLink="..." on <a> elements
    RouterLinkActive,   // routerLinkActive + [routerLinkActiveOptions]
    RouterOutlet,       // <router-outlet>
  ],
  templateUrl: './brand-dashboard.component.html',
  styleUrls:   ['./brand-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandDashboardComponent implements OnInit, OnDestroy {

  user:      User | null = null;
  initials   = 'BR';
  collapsed  = false;
  search     = '';

  /** True when URL is exactly /dashboard/brand — show overview content */
  isOverview = false;

  private routerSub!: Subscription;

  constructor(
    private auth:   AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    if (this.user) {
      const f = this.user.firstName?.[0] ?? '';
      const l = this.user.lastName?.[0]  ?? '';
      this.initials = (f + l).toUpperCase() || 'BR';
    }

    this.checkOverview(this.router.url);
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => this.checkOverview(e.urlAfterRedirects));
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private checkOverview(url: string): void {
    this.isOverview = url === '/dashboard/brand' || url === '/dashboard/brand/';
  }

  logout(): void { this.auth.logout(); }
}