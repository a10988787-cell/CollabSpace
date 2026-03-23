import {
  Component, OnInit, OnDestroy,
  signal, ViewEncapsulation, ChangeDetectorRef,
  Inject, PLATFORM_ID, NgZone
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';

const API = 'http://localhost:5000/api';

const GRADS = [
  'linear-gradient(135deg,#8B5CF6,#6D28D9)',
  'linear-gradient(135deg,#38BDF8,#0EA5E9)',
  'linear-gradient(135deg,#34D399,#059669)',
  'linear-gradient(135deg,#FBBF24,#D97706)',
  'linear-gradient(135deg,#FB7185,#E11D48)',
  'linear-gradient(135deg,#A78BFA,#7C3AED)',
  'linear-gradient(135deg,#6EE7B7,#10B981)',
  'linear-gradient(135deg,#FCD34D,#F59E0B)',
];

function fmt(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return (n/1_000_000).toFixed(1)+'M';
  if (n >= 1_000)     return (n/1_000).toFixed(1)+'K';
  return String(n);
}

/* ─── Static demo data — shown instantly before API responds ─────────── */
const DEMO_KPIS = [
  { key:'creators', label:'Total Creators',   value:'1.2K', change:'+8.2%', positive:true,  ib:'rgba(139,92,246,.12)', ic:'#A78BFA', sc:'#8B5CF6', spark:[30,45,38,60,50,72,62,80,70,85,75,95] },
  { key:'brands',   label:'Brands',           value:'138',  change:'+5',    positive:true,  ib:'rgba(56,189,248,.12)', ic:'#38BDF8', sc:'#0EA5E9', spark:[20,35,50,40,65,55,72,60,80,70,85,90] },
  { key:'campaigns',label:'Active Campaigns', value:'47',   change:'+12',   positive:true,  ib:'rgba(251,191,36,.12)', ic:'#FBBF24', sc:'#F59E0B', spark:[40,55,45,68,58,75,65,80,72,85,78,95] },
  { key:'collabs',  label:'Collaborations',   value:'364',  change:'+22%',  positive:true,  ib:'rgba(52,211,153,.12)', ic:'#34D399', sc:'#10B981', spark:[25,40,35,55,45,62,52,70,60,75,68,82] },
];
const DEMO_MONTHLY = [
  { month:'Jan', creators:40, brands:8,  campaigns:12, collabs:28 },
  { month:'Feb', creators:55, brands:12, campaigns:18, collabs:40 },
  { month:'Mar', creators:48, brands:10, campaigns:15, collabs:35 },
  { month:'Apr', creators:70, brands:16, campaigns:24, collabs:58 },
  { month:'May', creators:60, brands:14, campaigns:20, collabs:48 },
  { month:'Jun', creators:85, brands:20, campaigns:30, collabs:72 },
];
const DEMO_CAMPAIGNS = [
  { id:1, name:'Summer Vibes',         brand:'LuxeWear',    niche:'Fashion', budget:12000, status:'active',    deadline:'Jun 30', slots:8,  filled:75,  total:23, contentType:'Video', brandGrad:GRADS[0], avatars:[{init:'A',color:'#8B5CF6'},{init:'M',color:'#34D399'}] },
  { id:2, name:'Tech Unboxing Series', brand:'Nexagen',     niche:'Tech',    budget:18500, status:'active',    deadline:'Jul 15', slots:5,  filled:40,  total:18, contentType:'Reel',  brandGrad:GRADS[1], avatars:[{init:'S',color:'#38BDF8'},{init:'R',color:'#FB7185'}] },
  { id:3, name:'Wellness Challenge',   brand:'Aura Health', niche:'Health',  budget:9500,  status:'pending',   deadline:'Jul 5',  slots:12, filled:20,  total:31, contentType:'Story', brandGrad:GRADS[2], avatars:[{init:'K',color:'#34D399'}] },
  { id:4, name:'Gourmet Kitchen',      brand:'ChefBox',     niche:'Food',    budget:7200,  status:'active',    deadline:'Aug 1',  slots:6,  filled:83,  total:14, contentType:'Video', brandGrad:GRADS[3], avatars:[{init:'P',color:'#FBBF24'}] },
  { id:5, name:'Adventure Gear',       brand:'TrekNorth',   niche:'Outdoor', budget:15000, status:'draft',     deadline:'Aug 20', slots:10, filled:0,   total:0,  contentType:'Video', brandGrad:GRADS[4], avatars:[] },
  { id:6, name:'Beauty Routine',       brand:'GlowUp',      niche:'Beauty',  budget:11000, status:'completed', deadline:'May 15', slots:8,  filled:100, total:8,  contentType:'Reel',  brandGrad:GRADS[5], avatars:[{init:'E',color:'#A78BFA'}] },
];
const DEMO_CREATORS = [
  { id:1, name:'Aria Chen',    handle:'@ariachen',   initials:'AC', niche:'Lifestyle', platform:'Instagram', platformColor:'#E1306C', followers:'842K', engRate:6.8, avatarGrad:GRADS[0], status:'active', rating:4.9 },
  { id:2, name:'Marcus Webb',  handle:'@marcuswebb', initials:'MW', niche:'Tech',      platform:'YouTube',   platformColor:'#FF0000', followers:'1.2M', engRate:4.5, avatarGrad:GRADS[1], status:'active', rating:4.7 },
  { id:3, name:'Sofia Reyes',  handle:'@sofiareyes', initials:'SR', niche:'Beauty',    platform:'TikTok',    platformColor:'#69C9D0', followers:'2.1M', engRate:9.2, avatarGrad:GRADS[4], status:'live',   rating:5.0 },
  { id:4, name:'Jayden Park',  handle:'@jaydenpark', initials:'JP', niche:'Fitness',   platform:'Instagram', platformColor:'#E1306C', followers:'567K', engRate:7.4, avatarGrad:GRADS[2], status:'active', rating:4.6 },
  { id:5, name:'Lena Müller',  handle:'@lenamuller', initials:'LM', niche:'Travel',    platform:'YouTube',   platformColor:'#FF0000', followers:'934K', engRate:5.1, avatarGrad:GRADS[3], status:'pending',rating:4.8 },
  { id:6, name:'Omar Hassan',  handle:'@omarhassan', initials:'OH', niche:'Food',      platform:'TikTok',    platformColor:'#69C9D0', followers:'3.4M', engRate:11.3,avatarGrad:GRADS[5], status:'live',   rating:4.9 },
  { id:7, name:'Priya Sharma', handle:'@priyasharma',initials:'PS', niche:'Finance',   platform:'Instagram', platformColor:'#E1306C', followers:'289K', engRate:8.7, avatarGrad:GRADS[6], status:'active', rating:4.5 },
  { id:8, name:'Diego Vargas', handle:'@diegovargas',initials:'DV', niche:'Gaming',    platform:'YouTube',   platformColor:'#FF0000', followers:'1.8M', engRate:6.2, avatarGrad:GRADS[7], status:'inactive',rating:4.3 },
];
const DEMO_BRANDS = [
  { name:'LuxeWear',    niche:'Fashion',  campaigns:12, spent:'$148K', creators:34, gradient:GRADS[0], connected:true  },
  { name:'Nexagen',     niche:'Tech',     campaigns:8,  spent:'$220K', creators:21, gradient:GRADS[1], connected:false },
  { name:'Aura Health', niche:'Wellness', campaigns:15, spent:'$87K',  creators:48, gradient:GRADS[2], connected:true  },
  { name:'ChefBox',     niche:'Food',     campaigns:6,  spent:'$62K',  creators:18, gradient:GRADS[3], connected:false },
  { name:'TrekNorth',   niche:'Outdoor',  campaigns:4,  spent:'$45K',  creators:12, gradient:GRADS[4], connected:false },
  { name:'GlowUp',      niche:'Beauty',   campaigns:20, spent:'$175K', creators:62, gradient:GRADS[5], connected:true  },
  { name:'ByteGadget',  niche:'Mobile',   campaigns:9,  spent:'$94K',  creators:27, gradient:GRADS[6], connected:false },
  { name:'PetPals',     niche:'Pets',     campaigns:5,  spent:'$38K',  creators:15, gradient:GRADS[7], connected:true  },
];

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule],
  templateUrl: './homepage.component.html',
  styleUrls: ['./homepage.component.css'],
  encapsulation: ViewEncapsulation.None,
})
export class HomepageComponent implements OnInit, OnDestroy {

  private isBrowser: boolean;
  private charts: any[] = [];
  private observer?: IntersectionObserver;
  private apiTimer: any;

  /* ── State ─────────────────────────────────────────────────── */
  isLiveData = false;
  readonly activeSection = signal<string>('dashboard');
  readonly campaignFilter = signal<string>('all');
  campaignSearch = '';
  creatorSearch  = '';
  contentSearch  = '';

  /* ── Data (pre-filled with demo) ─────────────────────────── */
  kpis      = DEMO_KPIS.map(k => ({ ...k }));
  monthly   = DEMO_MONTHLY.map(m => ({ ...m }));
  campaigns = DEMO_CAMPAIGNS.map(c => ({ ...c }));
  creators  = DEMO_CREATORS.map(c => ({ ...c }));
  brands    = DEMO_BRANDS.map(b => ({ ...b }));

  dealTypes = [
    { label:'Active',    pct:35, color:'#8B5CF6' },
    { label:'Pending',   pct:28, color:'#FBBF24' },
    { label:'Completed', pct:20, color:'#34D399' },
    { label:'Draft',     pct:17, color:'#3A385C'  },
  ];

  navItems = [
    { key:'dashboard', label:'Dashboard', badge:0 },
    { key:'campaigns', label:'Campaigns', badge:0 },
    { key:'creators',  label:'Creators',  badge:0 },
    { key:'brands',    label:'Brands',    badge:0 },
    { key:'analytics', label:'Analytics', badge:0 },
  ];

  campaignFilters = [
    { key:'all',       label:'All',       count:6 },
    { key:'active',    label:'Active',    count:3 },
    { key:'pending',   label:'Pending',   count:1 },
    { key:'completed', label:'Completed', count:1 },
  ];

  /* ── Legacy stubs ─────────────────────────────────────────── */
  parseFloat = parseFloat;
  fmtNum = fmt;
  chartRanges = ['1M','3M','6M','1Y'];
  contentSearch2 = '';
  chartLegend = [
    { label:'Creators Joined', color:'#8B5CF6' },
    { label:'Brands Joined',   color:'#38BDF8' },
    { label:'Campaigns',       color:'#FBBF24' },
    { label:'Collabs',         color:'#34D399' },
  ];
  contentTypes  = [
    { key:'all', label:'All', count:12 }, { key:'video', label:'Videos', count:4 },
    { key:'photo', label:'Photos', count:3 }, { key:'reel', label:'Reels', count:3 },
    { key:'story', label:'Stories', count:2 },
  ];
  contentItems: any[] = [
    { id:1, title:'Summer Collection Unboxing', type:'video', views:'284K', likes:'18.4K', gradient:'linear-gradient(135deg,#1E0A4A,#3B1FA8)', badgeBg:'rgba(139,92,246,.15)', badgeColor:'#A78BFA' },
    { id:2, title:'Morning Routine 2024',        type:'reel',  views:'1.2M', likes:'94K',   gradient:'linear-gradient(135deg,#0A1520,#0E3460)', badgeBg:'rgba(56,189,248,.15)',  badgeColor:'#38BDF8' },
    { id:3, title:'Tech Setup Tour',             type:'video', views:'567K', likes:'32K',   gradient:'linear-gradient(135deg,#0A2020,#0D4040)', badgeBg:'rgba(52,211,153,.15)',  badgeColor:'#34D399' },
    { id:4, title:'Glow Skincare Review',        type:'photo', views:'89K',  likes:'7.2K',  gradient:'linear-gradient(135deg,#2A0A20,#6D1042)', badgeBg:'rgba(251,113,133,.15)', badgeColor:'#FB7185' },
    { id:5, title:'Travel Vlog: Bali',           type:'video', views:'2.1M', likes:'148K',  gradient:'linear-gradient(135deg,#1A1A08,#3D3A10)', badgeBg:'rgba(251,191,36,.15)',  badgeColor:'#FBBF24' },
    { id:6, title:'Street Style Lookbook',       type:'reel',  views:'432K', likes:'28K',   gradient:'linear-gradient(135deg,#150B30,#4B1FA8)', badgeBg:'rgba(139,92,246,.15)',  badgeColor:'#A78BFA' },
  ];
  analyticsCards: any[] = [];
  analyticsRows: any[] = [];
  get heroStats()         { return this.kpis; }
  get kpiMetrics()        { return this.kpis; }
  get allCampaigns()      { return this.campaigns; }
  get filteredCampaignRows() { return this.filteredCampaigns; }
  get filteredContent()   { return this.contentItems; }
  setRange(_r: string)    { }
  onFindCampaigns()       { this.scrollTo('campaigns'); }
  onViewDemo()            { this.scrollTo('dashboard'); }
  onNewCampaign()         { this.goToSignup(); }
  onFilterCampaigns()     { this.scrollTo('campaigns'); }
  onInviteCreator()       { this.goToSignup(); }
  onAddBrand()            { this.goToSignup(); }
  onUploadContent()       { this.goToSignup(); }
  onExportReport()        { this.goToSignup(); }
  onUpgrade()             { this.goToSignup(); }
  onCampaignClick(c: any) { }
  onBrandClick(b: any)    { }
  applyToCampaign(c: any) { this.goToSignup(); }
  toggleBrandConnect(b: any) { this.toggleConnect(b); }

  /* ── Computed ──────────────────────────────────────────────── */
  get filteredCampaigns(): any[] {
    const f = this.campaignFilter();
    let rows = f === 'all' ? this.campaigns : this.campaigns.filter((c:any) => c.status === f);
    if (this.campaignSearch.trim()) {
      const q = this.campaignSearch.toLowerCase();
      rows = rows.filter((c:any) => (c.name||'').toLowerCase().includes(q) || (c.brand||'').toLowerCase().includes(q));
    }
    return rows;
  }
  get filteredCreators(): any[] {
    if (!this.creatorSearch.trim()) return this.creators;
    const q = this.creatorSearch.toLowerCase();
    return this.creators.filter((c:any) => (c.name||'').toLowerCase().includes(q) || (c.handle||'').toLowerCase().includes(q));
  }

  constructor(
    private router: Router,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    @Inject(PLATFORM_ID) platformId: object,
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /* ── Lifecycle ─────────────────────────────────────────────── */
  ngOnInit(): void {
    if (!this.isBrowser) return; // skip everything on server
    this.initScrollSpy();
    // Draw charts with demo data immediately
    this.waitForChartJS(() => this.initCharts());
    // Load real data in background after a short yield
    this.apiTimer = setTimeout(() => this.loadFromAPI(), 50);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    clearTimeout(this.apiTimer);
    this.destroyCharts();
  }

  /* ── API load (background, non-blocking) ───────────────────── */
  loadFromAPI(): void {
    this.http.get<any>(`${API}/stats/all`).pipe(
      timeout(5000),
      catchError(() => of(null)),
    ).subscribe(res => {
      if (!res?.success) return;
      this.zone.run(() => {
        this.applyStats(res);
        this.cdr.detectChanges();
        setTimeout(() => this.initCharts(), 30);
      });
    });
  }

  applyStats(res: any): void {
    const s = res.stats || {};
    this.isLiveData = true;

    // KPIs
    this.kpis[0].value = fmt(s.totalCreators   || 0);
    this.kpis[1].value = fmt(s.totalBrands      || 0);
    this.kpis[2].value = fmt(s.activeCampaigns  || 0);
    this.kpis[3].value = fmt(s.totalCollaborations || 0);

    // Monthly
    if (res.monthly?.length) this.monthly = res.monthly;

    // Campaigns
    if (res.campaigns?.length) {
      this.campaigns = res.campaigns.map((c: any, i: number) => ({
        id: i+1,
        name: c.title || c.name || 'Campaign',
        brand: c.brand?.companyName || c.brand?.firstName || 'Brand',
        niche: c.niche || 'General',
        budget: c.budget || 0,
        status: c.status || 'active',
        deadline: c.endDate ? new Date(c.endDate).toLocaleDateString('en',{month:'short',day:'numeric'}) : 'TBD',
        slots: c.slots || 5,
        filled: c.filledPct || 0,
        total: c.applicantCount || 0,
        contentType: (c.platforms||['Video'])[0] || 'Video',
        brandGrad: GRADS[i % GRADS.length],
        avatars: [],
      }));
      this.campaignFilters[0].count = this.campaigns.length;
      this.campaignFilters[1].count = this.campaigns.filter((c:any)=>c.status==='active').length;
      this.campaignFilters[2].count = this.campaigns.filter((c:any)=>c.status==='pending').length;
      this.campaignFilters[3].count = this.campaigns.filter((c:any)=>c.status==='completed').length;
      this.navItems[1].badge = this.campaignFilters[1].count;
    }

    // Creators
    if (res.creators?.length) {
      const platColor: any = { Instagram:'#E1306C', YouTube:'#FF0000', TikTok:'#69C9D0' };
      this.creators = res.creators.map((c: any, i: number) => ({
        id: i+1,
        name: c.name || (c.firstName+' '+c.lastName),
        handle: '@'+(c.handle || (c.name||'').toLowerCase().replace(/\s/g,'')),
        initials: c.initials || (c.name||'??').split(' ').map((n:string)=>n[0]).join('').toUpperCase().slice(0,2),
        niche: c.niche || 'Creator',
        platform: c.platform || 'Instagram',
        platformColor: platColor[c.platform] || '#8B5CF6',
        followers: typeof c.followers === 'number' ? fmt(c.followers) : c.followers || '0',
        engRate: +(c.engRate||0).toFixed(1),
        avatarGrad: GRADS[i % GRADS.length],
        status: c.status || 'active',
        rating: c.rating || 4.5,
      }));
    }

    // Brands
    if (res.brands?.length) {
      this.brands = res.brands.map((b: any, i: number) => ({
        name: b.name, niche: b.niche || 'Brand',
        campaigns: b.campaigns || 0, spent: b.spent || '$0K',
        creators: b.creators || 0, gradient: GRADS[i % GRADS.length],
        connected: false, isVerified: b.isVerified,
      }));
    }

    // Donut — campaign status breakdown
    const total = this.campaigns.length || 1;
    this.dealTypes = [
      { label:'Active',    pct: Math.round(this.campaigns.filter((c:any)=>c.status==='active').length/total*100),    color:'#8B5CF6' },
      { label:'Pending',   pct: Math.round(this.campaigns.filter((c:any)=>c.status==='pending').length/total*100),   color:'#FBBF24' },
      { label:'Completed', pct: Math.round(this.campaigns.filter((c:any)=>c.status==='completed').length/total*100), color:'#34D399' },
      { label:'Draft',     pct: Math.round(this.campaigns.filter((c:any)=>c.status==='draft').length/total*100),     color:'#3A385C' },
    ];
  }

  /* ── Chart.js ──────────────────────────────────────────────── */
  private waitForChartJS(fn: () => void, n = 0): void {
    if ((window as any).Chart) { fn(); return; }
    if (n > 30) return;
    setTimeout(() => this.waitForChartJS(fn, n+1), 100);
  }

  destroyCharts(): void {
    this.charts.forEach(c => { try { c.destroy(); } catch(_){} });
    this.charts = [];
  }

  initCharts(): void {
    if (!this.isBrowser) return;
    const Chart = (window as any).Chart;
    if (!Chart) return;
    this.destroyCharts();

    const FONT = "'DM Sans',sans-serif";
    const GRID = 'rgba(139,92,246,.07)';
    const TICK = '#3A385C';

    const mkChart = (id: string, cfg: any) => {
      const el = document.getElementById(id) as HTMLCanvasElement;
      if (!el) return;
      try { this.charts.push(new Chart(el.getContext('2d'), cfg)); } catch(_){}
    };

    const labels = this.monthly.map((m:any) => m.month);

    // 1. Main bar+line growth chart
    mkChart('chart_revenue', {
      type:'bar',
      data:{ labels, datasets:[
        { type:'bar',  label:'Creators',    data:this.monthly.map((m:any)=>m.creators||0), backgroundColor:'rgba(139,92,246,.22)', borderColor:'#8B5CF6', borderWidth:1.5, borderRadius:5, order:3 },
        { type:'bar',  label:'Brands',      data:this.monthly.map((m:any)=>m.brands||0),   backgroundColor:'rgba(56,189,248,.18)',  borderColor:'#38BDF8', borderWidth:1.5, borderRadius:5, order:2 },
        { type:'line', label:'Campaigns',   data:this.monthly.map((m:any)=>m.campaigns||0),fill:false,borderColor:'#FBBF24',borderWidth:2.5,pointBackgroundColor:'#FBBF24',pointRadius:4,tension:0.4,order:1 },
        { type:'line', label:'Collabs',     data:this.monthly.map((m:any)=>m.collabs||0),  fill:true,backgroundColor:'rgba(52,211,153,.07)',borderColor:'#34D399',borderWidth:2,pointRadius:3,tension:0.4,order:0 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{ display:true, position:'top', align:'end', labels:{color:'#9896BC',font:{size:11,family:FONT},boxWidth:10,padding:14}},
          tooltip:{backgroundColor:'rgba(12,14,30,.95)',borderColor:'rgba(139,92,246,.3)',borderWidth:1,titleColor:'#EEEEFF',bodyColor:'#9896BC',padding:10}},
        scales:{ x:{grid:{color:GRID},ticks:{color:TICK,font:{size:11,family:FONT}}}, y:{grid:{color:GRID},ticks:{color:TICK,font:{size:11,family:FONT}}}},
        animation:{duration:700}},
    });

    // 2. Donut — campaign status
    mkChart('chart_donut', {
      type:'doughnut',
      data:{ labels:this.dealTypes.map(d=>d.label),
        datasets:[{ data:this.dealTypes.map(d=>d.pct), backgroundColor:this.dealTypes.map(d=>d.color), borderWidth:2, borderColor:'#0C0E1E', hoverOffset:6 }]},
      options:{ responsive:true, maintainAspectRatio:true, cutout:'72%',
        plugins:{ legend:{display:false}, tooltip:{backgroundColor:'rgba(12,14,30,.95)',borderColor:'rgba(139,92,246,.3)',borderWidth:1,titleColor:'#EEEEFF',bodyColor:'#9896BC',padding:10}},
        animation:{duration:700}},
    });

    // 3. Platform horizontal bar
    const platCount: Record<string,number> = {};
    this.creators.forEach((c:any) => { platCount[c.platform]=(platCount[c.platform]||0)+1; });
    const platL = Object.keys(platCount).length ? Object.keys(platCount) : ['Instagram','YouTube','TikTok'];
    const platD = platL.map(p=>platCount[p]||1);
    const platColors = {'Instagram':'#E1306C','YouTube':'#FF0000','TikTok':'#69C9D0'} as any;
    mkChart('chart_platform', {
      type:'bar',
      data:{ labels:platL, datasets:[{ label:'Creators', data:platD,
        backgroundColor:platL.map(p=>(platColors[p]||'#8B5CF6')+'33'),
        borderColor:platL.map(p=>platColors[p]||'#8B5CF6'), borderWidth:1.5, borderRadius:6 }]},
      options:{ responsive:true, maintainAspectRatio:false, indexAxis:'y' as const,
        plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(12,14,30,.95)',borderColor:'rgba(139,92,246,.3)',borderWidth:1,titleColor:'#EEEEFF',bodyColor:'#9896BC',padding:10}},
        scales:{ x:{grid:{color:GRID},ticks:{color:TICK,font:{size:11,family:FONT}}}, y:{grid:{color:'transparent'},ticks:{color:'#EEEEFF',font:{size:12,family:FONT}}}},
        animation:{duration:700}},
    });

    // 4. Budget bar
    const sorted = [...this.campaigns].sort((a:any,b:any)=>b.budget-a.budget).slice(0,6);
    mkChart('chart_budget', {
      type:'bar',
      data:{ labels:sorted.map((c:any)=>c.name.length>14?c.name.slice(0,14)+'…':c.name),
        datasets:[{ label:'Budget',data:sorted.map((c:any)=>c.budget||0),
          backgroundColor:GRADS.slice(0,sorted.length).map(g=>{const m=g.match(/#[0-9A-Fa-f]{6}/);return m?m[0]+'33':'rgba(139,92,246,.2)';}),
          borderColor:GRADS.slice(0,sorted.length).map(g=>{const m=g.match(/#[0-9A-Fa-f]{6}/);return m?m[0]:'#8B5CF6';}),
          borderWidth:1.5,borderRadius:6 }]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(12,14,30,.95)',borderColor:'rgba(139,92,246,.3)',borderWidth:1,titleColor:'#EEEEFF',bodyColor:'#9896BC',padding:10,callbacks:{label:(c:any)=>' $'+Number(c.raw).toLocaleString()}}},
        scales:{ x:{grid:{color:'transparent'},ticks:{color:'#9896BC',font:{size:10,family:FONT}}}, y:{grid:{color:GRID},ticks:{color:TICK,font:{size:11,family:FONT},callback:(v:any)=>'$'+(v>=1000?(v/1000).toFixed(0)+'K':v)}}},
        animation:{duration:700}},
    });

    // 5. Engagement radar
    const top = [...this.creators].sort((a:any,b:any)=>b.engRate-a.engRate).slice(0,8);
    mkChart('chart_engagement', {
      type:'radar',
      data:{ labels:top.map((c:any)=>c.name.split(' ')[0]),
        datasets:[{ label:'Eng %',data:top.map((c:any)=>+c.engRate||0),
          backgroundColor:'rgba(139,92,246,.12)',borderColor:'#8B5CF6',borderWidth:2,pointBackgroundColor:'#8B5CF6',pointRadius:4 }]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{legend:{display:false},tooltip:{backgroundColor:'rgba(12,14,30,.95)',borderColor:'rgba(139,92,246,.3)',borderWidth:1,titleColor:'#EEEEFF',bodyColor:'#9896BC',padding:10,callbacks:{label:(c:any)=>c.raw+'%'}}},
        scales:{r:{grid:{color:GRID},angleLines:{color:GRID},ticks:{color:TICK,font:{size:10,family:FONT},backdropColor:'transparent'},pointLabels:{color:'#9896BC',font:{size:10,family:FONT}}}},
        animation:{duration:700}},
    });

    // 6. Spark mini-lines
    this.kpis.forEach((kpi:any) => {
      mkChart('spark_'+kpi.key, {
        type:'line',
        data:{ labels:kpi.spark.map(()=>''), datasets:[{ data:kpi.spark, fill:true, borderColor:kpi.sc, backgroundColor:kpi.sc+'22', borderWidth:2, pointRadius:0, tension:0.4 }]},
        options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false},tooltip:{enabled:false}}, scales:{x:{display:false},y:{display:false}}, animation:{duration:400}},
      });
    });

    // 7 & 8. Analytics section clones
    mkChart('chart_revenue2', {
      type:'line',
      data:{ labels, datasets:[
        { label:'Creators',data:this.monthly.map((m:any)=>m.creators||0),fill:true,backgroundColor:'rgba(139,92,246,.08)',borderColor:'#8B5CF6',borderWidth:2.5,pointRadius:4,tension:0.4 },
        { label:'Collabs', data:this.monthly.map((m:any)=>m.collabs||0), fill:false,borderColor:'#34D399',borderWidth:2,pointRadius:3,tension:0.4 },
      ]},
      options:{ responsive:true, maintainAspectRatio:false,
        plugins:{ legend:{display:true,position:'top',align:'end',labels:{color:'#9896BC',font:{size:11,family:FONT},boxWidth:10,padding:14}},
          tooltip:{backgroundColor:'rgba(12,14,30,.95)',borderColor:'rgba(139,92,246,.3)',borderWidth:1,titleColor:'#EEEEFF',bodyColor:'#9896BC',padding:10}},
        scales:{ x:{grid:{color:GRID},ticks:{color:TICK,font:{size:11,family:FONT}}}, y:{grid:{color:GRID},ticks:{color:TICK,font:{size:11,family:FONT}}}},
        animation:{duration:700}},
    });
    mkChart('chart_platform2', {
      type:'doughnut',
      data:{ labels:platL, datasets:[{ data:platD, backgroundColor:platL.map(p=>platColors[p]||'#8B5CF6'), borderColor:'#0C0E1E', borderWidth:2, hoverOffset:6 }]},
      options:{ responsive:true, maintainAspectRatio:false, cutout:'60%',
        plugins:{ legend:{display:true,position:'right',labels:{color:'#9896BC',font:{size:11,family:FONT},boxWidth:10,padding:14}},
          tooltip:{backgroundColor:'rgba(12,14,30,.95)',borderColor:'rgba(139,92,246,.3)',borderWidth:1,titleColor:'#EEEEFF',bodyColor:'#9896BC',padding:10}},
        animation:{duration:700}},
    });
  }

  /* ── Scroll spy ─────────────────────────────────────────────── */
  private initScrollSpy(): void {
    this.observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) this.activeSection.set(e.target.id); }),
      { rootMargin:'-25% 0px -65% 0px', threshold:0 }
    );
    setTimeout(() => document.querySelectorAll('.section-anchor').forEach(el => this.observer?.observe(el)), 300);
  }

  /* ── Helpers ─────────────────────────────────────────────────── */
  setCampaignFilter(k: string) { this.campaignFilter.set(k); }
  setContentFilter(_k: string) { }

  getStatusClass(s: string) {
    return { active:'chip--active', pending:'chip--pending', completed:'chip--completed', draft:'chip--draft', live:'chip--live' }[s] || 'chip--draft';
  }
  getStars(r: number): boolean[] { return [1,2,3,4,5].map(i => i <= Math.round(r)); }
  scrollTo(section: string) {
    this.activeSection.set(section);
    document.getElementById(section)?.scrollIntoView({ behavior:'smooth', block:'start' });
  }
  goToLogin()  { this.router.navigate(['/auth/login']); }
  goToSignup() { this.router.navigate(['/auth/signup']); }
  toggleConnect(b: any) { b.connected = !b.connected; }
}