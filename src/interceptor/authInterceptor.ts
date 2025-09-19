import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable, catchError, from, switchMap } from 'rxjs';
import { fetchAuthSession } from '@aws-amplify/auth';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    return from(fetchAuthSession()).pipe(
        switchMap(session => {
            // Access the idToken property directly
            const idToken = session.tokens.idToken;

            // Check if the idToken exists and has a token string
            if (idToken) {
                const token = idToken.toString(); // Get the raw JWT string
                const authReq = req.clone({
                    setHeaders: {
                        Authorization: `Bearer ${token}`
                    }
                });
                return next.handle(authReq);
            } else {
                // If there's no session or token, just continue with the original request
                return next.handle(req);
            }
        }),
        catchError(error => {
            // Handle cases where fetchAuthSession() fails
            console.error('Failed to get auth session:', error);
            return next.handle(req);
        })
    );
}
}