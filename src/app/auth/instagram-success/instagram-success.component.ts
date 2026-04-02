// src/app/auth/instagram-success/instagram-success.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser, DecimalPipe } from '@angular/common';
import { Router, ActivatedRoute }                        from '@angular/router';
import { AuthService }                                   from '../../services/auth.service';

@Component({
  selector: 'app-instagram-success',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './instagram-success.component.html',
  styleUrls:  ['./instagram-success.component.css'],
})
export class InstagramSuccessComponent implements OnInit {

  state: 'loading' | 'success' | 'error' = 'loading';
  errorMsg = '';
  countdown = 2;

  /* Instagram profile data from URL params */
  profile = {
    username:  '',
    name:      '',
    followers: 0,
    following: 0,
    posts:     0,
    engRate:   0,
    pic:       '',
    bio:       '',
    role:      'creator',
  };

  constructor(
    private route:  ActivatedRoute,
    private router: Router,
    private auth:   AuthService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.route.queryParams.subscribe(params => {
      /* ── Error from backend ── */
      if (params['error']) {
        this.state    = 'error';
        this.errorMsg = this.friendlyError(params['error'], params['msg']);
        return;
      }

      const token = params['token'];
      if (!token) {
        this.state    = 'error';
        this.errorMsg = 'No authentication token received. Please try again.';
        return;
      }

      /* ── Parse profile from URL params ── */
      this.profile = {
        username:  params['username']  || '',
        name:      params['name']      || params['username'] || '',
        followers: +(params['followers'] || 0),
        following: +(params['following'] || 0),
        posts:     +(params['posts']     || 0),
        engRate:   +(params['engRate']   || 0),
        pic:       params['pic']       || '',
        bio:       params['bio']       || '',
        role:      params['role']      || 'creator',
      };

      /* ── Save session ── */
      this.auth.saveInstagramSession(token, {
        role:      this.profile.role,
        username:  this.profile.username,
        followers: this.profile.followers,
      });

      this.state = 'success';

      /* ── Countdown redirect ── */
      const destination = this.profile.role === 'brand'
        ? '/dashboard/brand'
        : this.profile.role === 'admin'
          ? '/dashboard/admin'
          : '/dashboard/creator';

      const tick = setInterval(() => {
        this.countdown--;
        if (this.countdown <= 0) {
          clearInterval(tick);
          this.router.navigateByUrl(destination, { replaceUrl: true });
        }
      }, 1000);
    });
  }

  retry(): void { this.router.navigate(['/auth/login']); }

  fmtNum(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1)     + 'K';
    return String(n);
  }

  private friendlyError(code: string, detail?: string): string {
    const map: Record<string, string> = {
      instagram_not_configured: 'Instagram login is not configured on this server. Please ask the admin to add INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET to the .env file.',
      instagram_denied:         'You cancelled the Instagram authorisation. Please try again.',
      instagram_token_failed:   'Failed to get an access token from Instagram. Please try again.',
      instagram_profile_failed: 'Could not fetch your Instagram profile. Make sure your app has the correct permissions.',
      instagram_server_error:   `An unexpected error occurred: ${detail || 'Please try again.'}`,
    };
    return map[code] || `Instagram login failed (${code}). Please try again.`;
  }
}