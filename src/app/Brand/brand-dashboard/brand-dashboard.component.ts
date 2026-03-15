// src/app/brand/brand-dashboard/brand-dashboard.component.ts
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule }                          from '@angular/common';
import { FormsModule }                           from '@angular/forms';
import {
  Router,
  RouterOutlet,
  RouterLink,
  RouterLinkActive,
}                                                from '@angular/router';
import { AuthService, User }                     from '../../services/auth.service';

@Component({
  selector: 'app-brand-dashboard',
  standalone: true,
  // Angular 17+ standalone: each directive must be imported individually.
  // Using RouterModule alone does NOT make routerLinkActiveOptions, ngModel,
  // or router-outlet work — they each need their own import.
  imports: [
    CommonModule,       // *ngIf, *ngFor, | date, | number etc.
    FormsModule,        // [(ngModel)] on the search input
    RouterLink,         // routerLink="..." attribute on <a> tags
    RouterLinkActive,   // routerLinkActive + [routerLinkActiveOptions]
    RouterOutlet,       // <router-outlet> element
  ],
  templateUrl: './brand-dashboard.component.html',
  styleUrls:  ['./brand-dashboard.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandDashboardComponent implements OnInit {

  user:      User | null = null;
  initials   = 'BR';
  collapsed  = false;
  search     = '';

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
  }

  logout(): void {
    this.auth.logout();
  }
}