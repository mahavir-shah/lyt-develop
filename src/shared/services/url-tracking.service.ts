// url-tracking.service.ts
import { Injectable } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class UrlTrackingService {
  private previousUrlSubject = new BehaviorSubject<string>('');
  private currentUrlSubject = new BehaviorSubject<string>('');

  public previousUrl$ = this.previousUrlSubject.asObservable();
  public currentUrl$ = this.currentUrlSubject.asObservable();

  private previousUrl: string = '';
  private currentUrl: string = '';

  constructor(private router: Router) {
    this.initializeTracking();
  }

  /**
   * Initialize URL tracking
   */
  private initializeTracking(): void {
    let previousUrl = '';

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.previousUrl = previousUrl;
        previousUrl = event.urlAfterRedirects;
        this.currentUrl = event.url;

        // Update subjects
        this.previousUrlSubject.next(this.previousUrl);
        this.currentUrlSubject.next(this.currentUrl);

        console.log('Previous:', this.previousUrl);
        console.log('Current:', this.currentUrl);
      });
  }

  /**
   * Get previous URL synchronously
   */
  getPreviousUrl(): string {
    return this.previousUrl;
  }

  /**
   * Get current URL synchronously
   */
  getCurrentUrl(): string {
    return this.currentUrl;
  }

  /**
   * Get previous URL as Observable (subscribe in template with async pipe)
   */
  getPreviousUrlObservable(): Observable<string> {
    return this.previousUrl$;
  }

  /**
   * Check if came from specific route
   */
  cameFrom(route: string): boolean {
    return this.previousUrl.includes(route);
  }

  /**
   * Get route name only (without query params)
   */
  getPreviousRoute(): string {
    return this.previousUrl.split('?')[0];
  }

  /**
   * Get full history (if you want to track multiple previous URLs)
   */
  private urlHistory: string[] = [];

  getUrlHistory(): string[] {
    return this.urlHistory;
  }

  addToHistory(url: string): void {
    this.urlHistory.push(url);
    // Keep only last 10 URLs
    if (this.urlHistory.length > 10) {
      this.urlHistory.shift();
    }
  }
}