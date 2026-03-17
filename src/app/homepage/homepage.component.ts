import { Component, OnInit, OnDestroy, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

/* ─── Interfaces ──────────────────────────────────────────────────────────── */
export interface NavItem      { key: string; label: string; badge?: number; }
export interface HeroStat     { label: string; value: string; change: string; positive: boolean; }
export interface KpiMetric    { key: string; label: string; value: string; change: string; positive: boolean; iconBg: string; iconColor: string; sparkColor: string; spark: number[]; }
export interface Campaign     { id: number; name: string; brand: string; niche: string; budget: number; status: 'active'|'pending'|'completed'|'draft'; deadline: string; slots: number; filled: number; total: number; contentType: string; brandGrad: string; avatars: { init: string; color: string }[]; }
export interface Creator      { id: number; name: string; handle: string; initials: string; niche: string; platform: string; platformColor: string; followers: string; engRate: number; avgDeal: number; status: string; rating: number; avatarGrad: string; }
export interface Brand        { id: number; name: string; niche: string; campaigns: number; spent: string; creators: number; gradient: string; connected: boolean; }
export interface ContentItem  { id: number; title: string; type: 'video'|'photo'|'story'|'reel'; views: string; likes: string; gradient: string; badgeBg: string; badgeColor: string; }
export interface AnalyticsCard{ key: string; title: string; value: string; label: string; change: string; positive: boolean; color: string; linePath: string; areaPath: string; }
export interface AnalyticsRow { campaign: string; creator: string; initials: string; avatarGrad: string; impressions: string; clicks: string; ctr: string; conversions: string; revenue: number; roi: string; roiPositive: boolean; }
export interface DonutSeg     { color: string; dash: string; offset: number; }
export interface DealType     { label: string; pct: number; color: string; }

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HomepageComponent implements OnInit, OnDestroy {

  /* ── Signals ─────────────────────────────────────────────────────────── */
  readonly activeSection  = signal<string>('dashboard');
  readonly chartRange     = signal<string>('6M');
  readonly campaignFilter = signal<string>('all');
  readonly contentFilter  = signal<string>('all');

  campaignSearch = '';
  creatorSearch  = '';
  contentSearch  = '';

  /* ── Navigation ──────────────────────────────────────────────────────── */
  navItems: NavItem[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'campaigns', label: 'Campaigns', badge: 3 },
    { key: 'creators',  label: 'Creators' },
    { key: 'brands',    label: 'Brands' },
    { key: 'content',   label: 'Content' },
    { key: 'analytics', label: 'Analytics' },
  ];

  /* ── Hero Stats ──────────────────────────────────────────────────────── */
  heroStats: HeroStat[] = [
    { label: 'Total Revenue',    value: '$284K',  change: '+18.4%', positive: true  },
    { label: 'Active Campaigns', value: '47',     change: '+12',    positive: true  },
    { label: 'Creator Network',  value: '1,284',  change: '+8.2%',  positive: true  },
  ];

  /* ── KPI Metrics ─────────────────────────────────────────────────────── */
  kpiMetrics: KpiMetric[] = [
    {
      key: 'revenue', label: 'Total Revenue',
      value: '$284,750', change: '+18.4%', positive: true,
      iconBg: 'rgba(139,92,246,0.12)', iconColor: '#A78BFA',
      sparkColor: '#8B5CF6',
      spark: [30,55,40,70,50,80,65,90,75,95,85,100],
    },
    {
      key: 'campaigns', label: 'Active Campaigns',
      value: '47', change: '+12', positive: true,
      iconBg: 'rgba(251,191,36,0.12)', iconColor: '#FBBF24',
      sparkColor: '#F59E0B',
      spark: [20,35,50,40,65,55,72,60,80,70,85,90],
    },
    {
      key: 'creators', label: 'Creator Partners',
      value: '1,284', change: '+8.2%', positive: true,
      iconBg: 'rgba(52,211,153,0.12)', iconColor: '#34D399',
      sparkColor: '#10B981',
      spark: [40,55,45,68,58,75,65,80,72,85,78,95],
    },
    {
      key: 'brands', label: 'Brand Clients',
      value: '138', change: '+5', positive: true,
      iconBg: 'rgba(56,189,248,0.12)', iconColor: '#38BDF8',
      sparkColor: '#0EA5E9',
      spark: [25,40,35,55,45,62,52,70,60,75,68,82],
    },
  ];

  /* ── Chart ───────────────────────────────────────────────────────────── */
  chartRanges = ['1M','3M','6M','1Y'];

  chartLegend = [
    { label: 'Brand Spend',       color: '#8B5CF6' },
    { label: 'Creator Earnings',  color: '#FBBF24' },
    { label: 'Avg Engagement',    color: '#34D399' },
  ];

  gridY    = [40, 80, 120, 160];
  yLabels  = [{ y: 165, label: '0' }, { y: 125, label: '25K' }, { y: 85, label: '50K' }, { y: 45, label: '75K' }];

  private data1 = [38, 52, 44, 68, 58, 78, 65, 82, 72, 88, 80, 95];
  private data2 = [28, 44, 36, 58, 48, 68, 55, 74, 62, 80, 70, 88];
  private data3 = [20, 35, 28, 48, 38, 55, 44, 60, 52, 68, 58, 75];
  private months6M = ['Jan','Feb','Mar','Apr','May','Jun'];
  private months1Y = ['Jan','Mar','May','Jul','Sep','Nov'];

  get xLabels() {
    const r = this.chartRange();
    const lbls = r === '1Y' ? this.months1Y : r === '3M' ? ['Apr','May','Jun'] : r === '1M' ? ['W1','W2','W3','W4'] : this.months6M;
    const n = this.data1.length; const step = 580 / (n - 1);
    return lbls.map((text, i) => ({ x: 40 + i * (step * ((n-1)/(lbls.length-1))), text })).slice(0, lbls.length);
  }

  get chartBars() {
    const n = this.data1.length; const step = 580 / (n - 1); const bw = 28; const base = 165;
    return this.data1.map((v, i) => { const h = (v / 100) * 120; return { x: 40 + i * step - bw/2, y: base - h, w: bw, h }; });
  }

  private makeLine(data: number[], base = 165, maxH = 100) {
    const n = data.length; const step = 580 / (n - 1);
    return data.map((v, i) => ({ x: 40 + i * step, y: base - (v / 100) * maxH }));
  }

  private dotsToPath(dots: { x: number; y: number }[]) {
    return dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x},${d.y}`).join(' ');
  }

  private dotsToArea(dots: { x: number; y: number }[], base = 165) {
    const path = this.dotsToPath(dots);
    return `${path} L${dots[dots.length-1].x},${base} L${dots[0].x},${base} Z`;
  }

  get lineDots1()    { return this.makeLine(this.data2); }
  get linePath1()    { return this.dotsToPath(this.lineDots1); }
  get lineAreaPath1(){ return this.dotsToArea(this.lineDots1); }
  get linePath2()    { return this.dotsToPath(this.makeLine(this.data3)); }
  get lineAreaPath2(){ return this.dotsToArea(this.makeLine(this.data3)); }

  /* ── Donut ───────────────────────────────────────────────────────────── */
  dealTypes: DealType[] = [
    { label: 'Sponsored Post', pct: 35, color: '#8B5CF6' },
    { label: 'Video Review',   pct: 28, color: '#FBBF24' },
    { label: 'Brand Ambassador', pct: 20, color: '#34D399' },
    { label: 'Giveaway',       pct: 10, color: '#38BDF8' },
    { label: 'Other',          pct: 7,  color: '#FB7185' },
  ];

  get totalDeals() { return '364'; }

  get donutSegs(): DonutSeg[] {
    const r = 58; const circ = 2 * Math.PI * r; let offset = 0;
    return this.dealTypes.map(d => {
      const dl = (d.pct / 100) * circ;
      const seg = { color: d.color, dash: `${dl} ${circ - dl}`, offset: circ - offset };
      offset += dl; return seg;
    });
  }

  /* ── Campaigns ───────────────────────────────────────────────────────── */
  campaigns: Campaign[] = [
    { id:1, name:'Summer Vibes Collection', brand:'LuxeWear', niche:'Fashion', budget:12000, status:'active', deadline:'Jun 30', slots:8, filled:75, total:23, contentType:'Video', brandGrad:'linear-gradient(135deg,#8B5CF6,#6D28D9)', avatars:[{init:'A',color:'#8B5CF6'},{init:'M',color:'#34D399'},{init:'J',color:'#FBBF24'}] },
    { id:2, name:'Tech Unboxing Series',    brand:'Nexagen',  niche:'Tech',    budget:18500, status:'active', deadline:'Jul 15', slots:5, filled:40, total:18, contentType:'Reel',  brandGrad:'linear-gradient(135deg,#38BDF8,#0EA5E9)', avatars:[{init:'S',color:'#38BDF8'},{init:'R',color:'#FB7185'}] },
    { id:3, name:'Wellness Challenge',      brand:'Aura Health',niche:'Health', budget:9500, status:'pending',deadline:'Jul 5',  slots:12,filled:20, total:31, contentType:'Story', brandGrad:'linear-gradient(135deg,#34D399,#059669)', avatars:[{init:'K',color:'#34D399'},{init:'L',color:'#A78BFA'},{init:'N',color:'#FBBF24'}] },
    { id:4, name:'Gourmet Kitchen Series', brand:'ChefBox',   niche:'Food',    budget:7200, status:'active', deadline:'Aug 1',  slots:6, filled:83, total:14, contentType:'Video', brandGrad:'linear-gradient(135deg,#FBBF24,#D97706)', avatars:[{init:'P',color:'#FBBF24'},{init:'T',color:'#8B5CF6'}] },
    { id:5, name:'Adventure Gear Collab',  brand:'TrekNorth', niche:'Outdoor', budget:15000, status:'draft', deadline:'Aug 20', slots:10,filled:0,  total:0,  contentType:'Video', brandGrad:'linear-gradient(135deg,#FB7185,#E11D48)', avatars:[] },
    { id:6, name:'Beauty Routine Launch',  brand:'GlowUp',    niche:'Beauty',  budget:11000, status:'completed',deadline:'May 15',slots:8,filled:100,total:8, contentType:'Reel',  brandGrad:'linear-gradient(135deg,#A78BFA,#7C3AED)', avatars:[{init:'E',color:'#A78BFA'},{init:'V',color:'#34D399'}] },
  ];

  allCampaigns = this.campaigns;

  campaignFilters = [
    { key: 'all',       label: 'All',       count: 6  },
    { key: 'active',    label: 'Active',    count: 3  },
    { key: 'pending',   label: 'Pending',   count: 1  },
    { key: 'draft',     label: 'Draft',     count: 1  },
    { key: 'completed', label: 'Completed', count: 1  },
  ];

  get filteredCampaignRows() {
    const f = this.campaignFilter();
    let rows = f === 'all' ? this.allCampaigns : this.allCampaigns.filter(c => c.status === f);
    if (this.campaignSearch.trim()) {
      const q = this.campaignSearch.toLowerCase();
      rows = rows.filter(c => c.name.toLowerCase().includes(q) || c.brand.toLowerCase().includes(q));
    }
    return rows;
  }

  /* ── Creators ────────────────────────────────────────────────────────── */
  creators: Creator[] = [
    { id:1, name:'Aria Chen',      handle:'@ariachen',    initials:'AC', niche:'Lifestyle',   platform:'Instagram', platformColor:'#E1306C', followers:'842K', engRate:6.8, avgDeal:3200, status:'active',   rating:4.9, avatarGrad:'linear-gradient(135deg,#8B5CF6,#6D28D9)' },
    { id:2, name:'Marcus Webb',    handle:'@marcuswebb',  initials:'MW', niche:'Tech',         platform:'YouTube',   platformColor:'#FF0000', followers:'1.2M', engRate:4.5, avgDeal:5800, status:'active',   rating:4.7, avatarGrad:'linear-gradient(135deg,#38BDF8,#0EA5E9)' },
    { id:3, name:'Sofia Reyes',    handle:'@sofiareyes',  initials:'SR', niche:'Beauty',       platform:'TikTok',    platformColor:'#69C9D0', followers:'2.1M', engRate:9.2, avgDeal:2900, status:'live',     rating:5.0, avatarGrad:'linear-gradient(135deg,#FB7185,#E11D48)' },
    { id:4, name:'Jayden Park',    handle:'@jaydenpark',  initials:'JP', niche:'Fitness',      platform:'Instagram', platformColor:'#E1306C', followers:'567K', engRate:7.4, avgDeal:2100, status:'active',   rating:4.6, avatarGrad:'linear-gradient(135deg,#34D399,#059669)' },
    { id:5, name:'Lena Müller',    handle:'@lenamuller',  initials:'LM', niche:'Travel',       platform:'YouTube',   platformColor:'#FF0000', followers:'934K', engRate:5.1, avgDeal:4200, status:'pending',  rating:4.8, avatarGrad:'linear-gradient(135deg,#FBBF24,#D97706)' },
    { id:6, name:'Omar Hassan',    handle:'@omarhassan',  initials:'OH', niche:'Food',         platform:'TikTok',    platformColor:'#69C9D0', followers:'3.4M', engRate:11.3,avgDeal:3500, status:'live',     rating:4.9, avatarGrad:'linear-gradient(135deg,#A78BFA,#7C3AED)' },
    { id:7, name:'Priya Sharma',   handle:'@priyasharma', initials:'PS', niche:'Finance',      platform:'Instagram', platformColor:'#E1306C', followers:'289K', engRate:8.7, avgDeal:1800, status:'active',   rating:4.5, avatarGrad:'linear-gradient(135deg,#6EE7B7,#10B981)' },
    { id:8, name:'Diego Vargas',   handle:'@diegovargas', initials:'DV', niche:'Gaming',       platform:'YouTube',   platformColor:'#FF0000', followers:'1.8M', engRate:6.2, avgDeal:6200, status:'inactive', rating:4.3, avatarGrad:'linear-gradient(135deg,#FCD34D,#F59E0B)' },
  ];

  getStars(rating: number): boolean[] {
    return [1,2,3,4,5].map(i => i <= Math.round(rating));
  }

  /* ── Brands ──────────────────────────────────────────────────────────── */
  brands: Brand[] = [
    { id:1, name:'LuxeWear',    niche:'Fashion & Lifestyle', campaigns:12, spent:'$148K', creators:34, gradient:'linear-gradient(135deg,#8B5CF6,#6D28D9)', connected:true   },
    { id:2, name:'Nexagen',     niche:'Consumer Tech',        campaigns:8,  spent:'$220K', creators:21, gradient:'linear-gradient(135deg,#38BDF8,#0EA5E9)', connected:false  },
    { id:3, name:'Aura Health', niche:'Wellness & Fitness',   campaigns:15, spent:'$87K',  creators:48, gradient:'linear-gradient(135deg,#34D399,#059669)', connected:true   },
    { id:4, name:'ChefBox',     niche:'Food & Beverage',      campaigns:6,  spent:'$62K',  creators:18, gradient:'linear-gradient(135deg,#FBBF24,#D97706)', connected:false  },
    { id:5, name:'TrekNorth',   niche:'Outdoor & Adventure',  campaigns:4,  spent:'$45K',  creators:12, gradient:'linear-gradient(135deg,#FB7185,#E11D48)', connected:false  },
    { id:6, name:'GlowUp',      niche:'Beauty & Skincare',    campaigns:20, spent:'$175K', creators:62, gradient:'linear-gradient(135deg,#A78BFA,#7C3AED)', connected:true   },
    { id:7, name:'ByteGadget',  niche:'Mobile Accessories',   campaigns:9,  spent:'$94K',  creators:27, gradient:'linear-gradient(135deg,#6EE7B7,#059669)', connected:false  },
    { id:8, name:'PetPals',     niche:'Pet Care',             campaigns:5,  spent:'$38K',  creators:15, gradient:'linear-gradient(135deg,#FCD34D,#D97706)', connected:true   },
  ];

  toggleBrandConnect(brand: Brand) {
    brand.connected = !brand.connected;
  }

  /* ── Content ─────────────────────────────────────────────────────────── */
  contentTypes = [
    { key:'all',      label:'All',      count:12 },
    { key:'video',    label:'Videos',   count:4  },
    { key:'photo',    label:'Photos',   count:3  },
    { key:'reel',     label:'Reels',    count:3  },
    { key:'story',    label:'Stories',  count:2  },
  ];

  contentItems: ContentItem[] = [
    { id:1,  title:'Summer Collection Unboxing',   type:'video',  views:'284K', likes:'18.4K', gradient:'linear-gradient(135deg,#1E0A4A,#3B1FA8)', badgeBg:'rgba(139,92,246,0.15)', badgeColor:'#A78BFA' },
    { id:2,  title:'Morning Routine 2024',         type:'reel',   views:'1.2M', likes:'94K',   gradient:'linear-gradient(135deg,#0A1520,#0E3460)', badgeBg:'rgba(56,189,248,0.15)', badgeColor:'#38BDF8' },
    { id:3,  title:'Tech Setup Tour',              type:'video',  views:'567K', likes:'32K',   gradient:'linear-gradient(135deg,#0A2020,#0D4040)', badgeBg:'rgba(52,211,153,0.15)', badgeColor:'#34D399' },
    { id:4,  title:'Glow Skincare Review',         type:'photo',  views:'89K',  likes:'7.2K',  gradient:'linear-gradient(135deg,#2A0A20,#6D1042)', badgeBg:'rgba(251,113,133,0.15)', badgeColor:'#FB7185' },
    { id:5,  title:'Travel Vlog: Bali 2024',       type:'video',  views:'2.1M', likes:'148K',  gradient:'linear-gradient(135deg,#1A1A08,#3D3A10)', badgeBg:'rgba(251,191,36,0.15)', badgeColor:'#FBBF24' },
    { id:6,  title:'Street Style Lookbook',        type:'reel',   views:'432K', likes:'28K',   gradient:'linear-gradient(135deg,#150B30,#4B1FA8)', badgeBg:'rgba(139,92,246,0.15)', badgeColor:'#A78BFA' },
    { id:7,  title:'Healthy Meal Prep Guide',      type:'photo',  views:'196K', likes:'14K',   gradient:'linear-gradient(135deg,#081A10,#0D4422)', badgeBg:'rgba(52,211,153,0.15)', badgeColor:'#34D399' },
    { id:8,  title:'BTS: Brand Shoot Day',         type:'story',  views:'45K',  likes:'3.8K',  gradient:'linear-gradient(135deg,#1C0A0A,#4A1010)', badgeBg:'rgba(251,113,133,0.15)', badgeColor:'#FB7185' },
    { id:9,  title:'Fitness Challenge Week 1',     type:'reel',   views:'780K', likes:'62K',   gradient:'linear-gradient(135deg,#081420,#103260)', badgeBg:'rgba(56,189,248,0.15)', badgeColor:'#38BDF8' },
    { id:10, title:'Outdoor Adventure Gear',       type:'video',  views:'345K', likes:'24K',   gradient:'linear-gradient(135deg,#0A1C08,#1A4010)', badgeBg:'rgba(52,211,153,0.15)', badgeColor:'#34D399' },
    { id:11, title:'GRWM: Fashion Week',           type:'photo',  views:'129K', likes:'11K',   gradient:'linear-gradient(135deg,#200A2A,#5C1A6E)', badgeBg:'rgba(167,139,250,0.15)', badgeColor:'#A78BFA' },
    { id:12, title:'Quick Recipe: Pasta Night',    type:'story',  views:'67K',  likes:'5.1K',  gradient:'linear-gradient(135deg,#1A1208,#443010)', badgeBg:'rgba(251,191,36,0.15)', badgeColor:'#FBBF24' },
  ];

  get filteredContent() {
    const f = this.contentFilter();
    let items = f === 'all' ? this.contentItems : this.contentItems.filter(i => i.type === f);
    if (this.contentSearch.trim()) {
      const q = this.contentSearch.toLowerCase();
      items = items.filter(i => i.title.toLowerCase().includes(q));
    }
    return items;
  }

  /* ── Analytics ───────────────────────────────────────────────────────── */
  private makeSmallLine(pts: number[], w = 200, h = 70) {
    const n = pts.length; const stepX = w / (n - 1);
    const dots = pts.map((v, i) => ({ x: i * stepX, y: h - (v / 100) * (h * 0.85) }));
    const line = dots.map((d, i) => `${i === 0 ? 'M' : 'L'}${d.x},${d.y}`).join(' ');
    const area = `${line} L${dots[dots.length-1].x},${h} L0,${h} Z`;
    return { linePath: line, areaPath: area };
  }

  analyticsCards: AnalyticsCard[] = [
    { key:'imp', title:'Total Impressions', value:'48.6M',  label:'cumulative reach', change:'+22%', positive:true,  color:'#8B5CF6', ...this.makeSmallLine([20,35,28,50,40,65,55,72,62,78,70,88]) },
    { key:'ctr', title:'Avg Click-Through', value:'4.2%',   label:'across campaigns', change:'+0.8%',positive:true,  color:'#FBBF24', ...this.makeSmallLine([40,35,48,42,55,50,60,58,65,62,70,68]) },
    { key:'cvr', title:'Conversion Rate',   value:'2.8%',   label:'campaign average', change:'-0.3%',positive:false, color:'#FB7185', ...this.makeSmallLine([55,48,52,45,50,42,48,40,44,38,42,36]) },
    { key:'rev', title:'Revenue Generated', value:'$284K',  label:'total this period',change:'+18%', positive:true,  color:'#34D399', ...this.makeSmallLine([15,30,22,45,35,58,48,68,58,75,65,85]) },
    { key:'eng', title:'Avg Engagement',    value:'7.4%',   label:'per post',         change:'+1.2%',positive:true,  color:'#38BDF8', ...this.makeSmallLine([30,45,38,55,48,62,55,68,60,72,65,80]) },
    { key:'roi', title:'Average ROI',       value:'3.2x',   label:'return per dollar',change:'+0.4x',positive:true,  color:'#A78BFA', ...this.makeSmallLine([20,32,26,42,34,52,44,60,52,65,58,75]) },
  ];

  analyticsRows: AnalyticsRow[] = [
    { campaign:'Summer Vibes',      creator:'Aria Chen',   initials:'AC', avatarGrad:'linear-gradient(135deg,#8B5CF6,#6D28D9)', impressions:'2.8M', clicks:'112K', ctr:'4.0%', conversions:'3,360', revenue:22400, roi:'+186%', roiPositive:true  },
    { campaign:'Tech Unboxing',     creator:'Marcus Webb', initials:'MW', avatarGrad:'linear-gradient(135deg,#38BDF8,#0EA5E9)', impressions:'5.1M', clicks:'230K', ctr:'4.5%', conversions:'6,900', revenue:41400, roi:'+224%', roiPositive:true  },
    { campaign:'Wellness Challenge',creator:'Sofia Reyes', initials:'SR', avatarGrad:'linear-gradient(135deg,#FB7185,#E11D48)', impressions:'9.4M', clicks:'330K', ctr:'3.5%', conversions:'9,900', revenue:49500, roi:'+521%', roiPositive:true  },
    { campaign:'Gourmet Kitchen',   creator:'Omar Hassan', initials:'OH', avatarGrad:'linear-gradient(135deg,#A78BFA,#7C3AED)', impressions:'4.2M', clicks:'168K', ctr:'4.0%', conversions:'5,040', revenue:30240, roi:'+420%', roiPositive:true  },
    { campaign:'Adventure Gear',    creator:'Lena Müller', initials:'LM', avatarGrad:'linear-gradient(135deg,#FBBF24,#D97706)', impressions:'1.6M', clicks:'48K',  ctr:'3.0%', conversions:'1,440', revenue:8640,  roi:'+58%',  roiPositive:true  },
    { campaign:'Beauty Routine',    creator:'Priya Sharma',initials:'PS', avatarGrad:'linear-gradient(135deg,#34D399,#059669)', impressions:'3.7M', clicks:'111K', ctr:'3.0%', conversions:'3,330', revenue:19980, roi:'+82%',  roiPositive:true  },
    { campaign:'Fitness Series',    creator:'Jayden Park', initials:'JP', avatarGrad:'linear-gradient(135deg,#6EE7B7,#10B981)', impressions:'2.1M', clicks:'63K',  ctr:'3.0%', conversions:'1,890', revenue:11340, roi:'+54%',  roiPositive:true  },
  ];

  parseFloat = parseFloat;

  /* ── Constructor ─────────────────────────────────────────────────────── */
  constructor(private router: Router) {}

  /* ── Lifecycle ───────────────────────────────────────────────────────── */
  ngOnInit() {
    this.initScrollSpy();
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }

  private observer?: IntersectionObserver;

  private initScrollSpy() {
    if (typeof window === 'undefined') return;
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.activeSection.set(entry.target.id);
          }
        });
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: 0 }
    );
    setTimeout(() => {
      document.querySelectorAll('.section-anchor').forEach(el => this.observer?.observe(el));
    }, 100);
  }

  /* ── Signal setters ──────────────────────────────────────────────────── */
  setRange(r: string)          { this.chartRange.set(r); }
  setCampaignFilter(k: string) { this.campaignFilter.set(k); }
  setContentFilter(k: string)  { this.contentFilter.set(k); }

  scrollTo(section: string) {
    this.activeSection.set(section);
    const el = document.getElementById(section);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* ── Action Handlers ─────────────────────────────────────────────────── */
  onUpgrade()        { console.log('[CS] Upgrade'); }

  goToLogin():   void { this.router.navigate(['/auth/login']); }
  goToSignup():  void { this.router.navigate(['/auth/signup']); }
  onFindCampaigns()  { this.scrollTo('campaigns'); }
  onViewDemo()       { console.log('[CS] View demo'); }
  onNewCampaign()    { console.log('[CS] New campaign'); }
  onFilterCampaigns(){ console.log('[CS] Filter campaigns'); }
  onInviteCreator()  { console.log('[CS] Invite creator'); }
  onAddBrand()       { console.log('[CS] Add brand'); }
  onUploadContent()  { console.log('[CS] Upload content'); }
  onExportReport()   { console.log('[CS] Export report'); }
  onCampaignClick(c: Campaign) { console.log('[CS] Campaign:', c.name); }
  onBrandClick(b: Brand)       { console.log('[CS] Brand:', b.name); }
  applyToCampaign(c: Campaign) { console.log('[CS] Apply to:', c.name); }
}