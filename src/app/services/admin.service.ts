// src/app/services/admin.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly B = `${environment.apiUrl}/admin`;
  constructor(private http: HttpClient) {}

  private h(): HttpHeaders {
    const t = localStorage.getItem('cs_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${t}` });
  }

  // Generic CRUD
  list  (path: string, params?: any): Observable<any> {
    let p = new HttpParams();
    if (params) Object.keys(params).forEach(k => params[k] !== undefined && params[k] !== '' && (p = p.set(k, params[k])));
    return this.http.get(`${this.B}/${path}`, { headers: this.h(), params: p });
  }
  get   (path: string, id: string):           Observable<any> { return this.http.get(`${this.B}/${path}/${id}`, { headers: this.h() }); }
  create(path: string, body: any):            Observable<any> { return this.http.post(`${this.B}/${path}`, body, { headers: this.h() }); }
  update(path: string, id: string, body: any):Observable<any> { return this.http.put(`${this.B}/${path}/${id}`, body, { headers: this.h() }); }
  patch (path: string, id: string, body: any):Observable<any> { return this.http.patch(`${this.B}/${path}/${id}`, body, { headers: this.h() }); }
  remove(path: string, id: string):           Observable<any> { return this.http.delete(`${this.B}/${path}/${id}`, { headers: this.h() }); }

  // Analytics
  analytics(): Observable<any> { return this.http.get(`${this.B}/analytics`, { headers: this.h() }); }

  // Excel report download
  generateReport(type: string, params?: any): Observable<Blob> {
    let p = new HttpParams().set('type', type);
    if (params) Object.keys(params).forEach(k => params[k] !== undefined && (p = p.set(k, params[k])));
    return this.http.get(`${this.B}/reports/export`, {
      headers: this.h(), params: p, responseType: 'blob'
    });
  }
}