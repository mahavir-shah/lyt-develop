import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, map, take } from 'rxjs';
import { AuthService } from 'src/shared/services'; 
@Injectable({
    providedIn: 'root'
})
export class AuthGuard implements CanActivate {
    constructor(
        private authService: AuthService,
        private router: Router
    ) {}
    canActivate() /* : Observable<boolean> */ {
        
        return true;

        /* return this.authService.isAuthenticated$.pipe(take(1),map(isAuthenticated => {
            if (isAuthenticated) {
                return true;
            } else {
                this.router.navigate(['/login-page']);
                return false;
            }
        })); */
    }
}