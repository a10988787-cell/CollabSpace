import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../services/brand.service';

@Component({
  selector: 'app-brand-analytics',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './brand-analytics.component.html',
  styleUrls: ['./brand-analytics.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class BrandAnalyticsComponent implements OnInit {
  data: any = null; loading = true;
  constructor(private svc: BrandService) {}
  ngOnInit() { this.load(); }
  load() { this.loading=true; this.svc.getAnalytics().subscribe({ next:r=>{ this.data=r.analytics;this.loading=false; }, error:()=>this.loading=false }); }
}