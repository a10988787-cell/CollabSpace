import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { AdminCreatorsComponent }    from '../admin-creators/admin-creators.component';
import { AdminBrandsComponent }      from '../admin-brands/admin-brands.component';
import { AdminCampaignsComponent }   from '../admin-campaigns/admin-campaigns.component';
import { AdminPaymentsComponent }    from '../admin-payments/admin-payments.component';
import { AdminCollabPostsComponent } from '../admin-collab-posts/admin-collab-posts.component';
import { AdminCollaborationsComponent } from '../admin-collaborations/admin-collaborations.component';
import { AdminBudgetsComponent }     from '../admin-budgets/admin-budgets.component';
import { AdminPerformanceAnalyticsComponent } from '../admin-performance-analytics/admin-performance-analytics.component';
import { AdminGrowthMetricsComponent }        from '../admin-growth-metrics/admin-growth-metrics.component';
import { AdminCreatorProfilesComponent }      from '../admin-creator-profiles/admin-creator-profiles.component';
import { AdminBrandProfilesComponent }        from '../admin-brand-profiles/admin-brand-profiles.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    AdminCreatorsComponent, AdminBrandsComponent, AdminCampaignsComponent,
    AdminPaymentsComponent, AdminCollabPostsComponent, AdminCollaborationsComponent,
    AdminBudgetsComponent,
    AdminPerformanceAnalyticsComponent, AdminGrowthMetricsComponent,
    AdminCreatorProfilesComponent, AdminBrandProfilesComponent,
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls:   ['./admin-dashboard.component.css','../admin-shared.css'],
  encapsulation: ViewEncapsulation.None,
})
export class AdminDashboardComponent implements OnInit {
  user: any    = null;
  nav          = 'overview';
  collapsed    = false;
  loading      = true;
  reportLoading = false;
  selectedReport = 'users';

  // Only the 7 CRUDs present in admin panel
  reportTypes = [
    { value: 'users',          label: '👥 Users (all roles)'    },
    { value: 'creators',       label: '🎬 Creators'             },
    { value: 'brands',         label: '🏷️  Brands'              },
    { value: 'campaigns',      label: '📣 Campaigns'            },
    { value: 'payments',       label: '💳 Payments (Razorpay)'  },
    { value: 'collabposts',    label: '📸 Collab Posts'         },
    { value: 'collaborations', label: '🤝 Collaborations'       },
  ];

  kpis: any[] = [
    { label:'Total Creators',    val:'—', chg:'',     pos:true,  ic:'#A78BFA', ib:'rgba(139,92,246,.12)', key:'totalCreators'   },
    { label:'Total Brands',      val:'—', chg:'',     pos:true,  ic:'#38BDF8', ib:'rgba(56,189,248,.12)',  key:'totalBrands'     },
    { label:'Active Campaigns',  val:'—', chg:'',     pos:true,  ic:'#FBBF24', ib:'rgba(251,191,36,.12)',  key:'activeCampaigns' },
    { label:'Collaborations',    val:'—', chg:'',     pos:true,  ic:'#34D399', ib:'rgba(52,211,153,.12)',  key:'totalCollabs'    },
    { label:'Total Content',     val:'—', chg:'',     pos:false, ic:'#FB7185', ib:'rgba(251,113,133,.12)', key:'totalContent'    },
    { label:'Pending Reviews',   val:'—', chg:'',     pos:false, ic:'#FB7185', ib:'rgba(251,113,133,.12)', key:'pendingContent'  },
  ];

  monthly: any[] = [];

  navItems = [
    { key:'overview',        label:'Overview',         icon:'home'    },
    { key:'creators',        label:'Creators',         icon:'users'   },
    { key:'brands',          label:'Brands',           icon:'brand'   },
    { key:'campaigns',       label:'Campaigns',        icon:'campaign'},
    { key:'collabposts',     label:'Collab Posts',     icon:'post'    },
    { key:'collaborations',  label:'Collaborations',   icon:'collab'  },
    { key:'payments',        label:'Payments',         icon:'payment' },
    { key:'budgets',            label:'Budgets',              icon:'budget'   },
    { key:'creator-profiles',   label:'Creator Profiles',     icon:'users'    },
    { key:'brand-profiles',     label:'Brand Profiles',       icon:'brand'    },
    { key:'performance-analytics', label:'Performance Analytics', icon:'campaign' },
    { key:'growth-metrics',     label:'Growth Metrics',       icon:'post'     },
  ];

  constructor(private svc: AdminService, private auth: AuthService) {}

  ngOnInit(): void {
    this.user = this.auth.currentUser;
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.svc.analytics().subscribe({
      next: (r: any) => {
        const k = r.kpis || {};
        this.kpis.forEach(kpi => {
          if (k[kpi.key] !== undefined) kpi.val = String(k[kpi.key]);
        });
        this.monthly = r.monthly || [];
        this.loading = false;
      },
      error: () => { this.loading = false; },
    });
  }

  downloadReport(): void {
    this.reportLoading = true;
    this.svc.generateReport(this.selectedReport).subscribe({
      next: (blob: Blob) => {
        this.reportLoading = false;
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `CollabSpace_${this.selectedReport}_${new Date().toISOString().slice(0,10)}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => { this.reportLoading = false; alert('Report generation failed. Make sure xlsx is installed on backend.'); },
    });
  }

  logout(): void { this.auth.logout(); }
}