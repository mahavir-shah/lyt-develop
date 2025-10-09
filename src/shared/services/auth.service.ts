import { Injectable } from '@angular/core';
import { 
  signUp, 
  confirmSignUp,
  signIn,
  confirmResetPassword,
  fetchAuthSession,
  updateUserAttributes,
  updatePassword,
  deleteUser,
  signOut,
  resetPassword,
  getCurrentUser,
  SignInOutput,
  fetchUserAttributes,
} from 'aws-amplify/auth';
import { BehaviorSubject, Observable, forkJoin, from, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

export interface User {
  userId: string;
  username: string;
  email: string;
  attributes?: any;
}

export interface AuthError {
  code: string;
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  
  constructor() {
    this.checkAuthenticationStatus();
  }

  // ========== PUBLIC APIs (Unauthenticated) ==========

  /**
   * Register a new user using email as both username and email
   */
  registerUser(data: {email: string, password: string, first_name: string, last_name: string}): Observable<any> {
    return from(signUp({
      username: data.email, // Use email as username
      password: data.password,
      options: {
        userAttributes: {
          email: data.email,
          given_name: data.first_name,
          family_name: data.last_name
        },
      },
    })).pipe(
      map((result:any) => {
          return result;
      }),
      catchError(error => {
        console.error('Registration error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Confirm user registration with verification code
   */
  confirmRegistration(email: string, code: string): Observable<any> {
    return from(confirmSignUp({
      username: email, // Use email as username
      confirmationCode: code
    })).pipe(
      switchMap(result => {
        console.log('User confirmed successfully:', result);
        
        // Check if user is automatically signed in (autoSignIn was enabled during registration)
        if (result.isSignUpComplete && result.nextStep?.signUpStep === 'COMPLETE_AUTO_SIGN_IN') {
          // User will be automatically signed in, get current user info
          return this.getCurrentUserInfo().pipe(
            map(user => {
              this.currentUserSubject.next(user);
              this.isAuthenticatedSubject.next(true);
              console.log('User automatically signed in after confirmation:', user);
              return { ...result, user };
            })
          );
        }
        
        return [result];
      }),
      catchError(error => {
        console.error('Confirmation error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Authenticate user (Login) using email as username
   */
  loginUser(email: string, password: string): Observable<User> {
    return from(signIn({
      username: email, // Use email as username
      password
    })).pipe(
      switchMap((result) => {
        // Check if user is fully signed in
        if (result.isSignedIn) {
          return this.getCurrentUserInfo();
        } else {
          // Handle any additional challenges if needed
          console.log('Additional sign-in steps required:', result.nextStep);
          throw new Error('Sign-in not complete. Additional steps required.');
        }
      }),
      map(user => {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        console.log('User logged in successfully:', user);
        return user;
      }),
      catchError(error => {
        console.error('Login error:', error);
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return throwError(() => this.handleAuthError(error));
      })
    );
  } 
  // This function handles the entire SRP flow

  // This method now returns a Promise
  /* async loginUser(email, password): Promise<SignInOutput> {
    try {
      const result = await signIn({
        username: email, // Use email as username
        password
      });
      console.log(result);
      return result;
    } catch (error) {
      console.error('Login failed', error);
      throw error;
    }
  } */

  /**
   * Request password reset using email
   */
  requestPasswordReset(email: string): Observable<any> {
    return from(resetPassword({
      username: email // Use email as username
    })).pipe(
      map(result => {
        console.log('Password reset code sent:', result);
        return result;
      }),
      catchError(error => {
        console.error('Password reset request error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Reset password with verification code
   */
  resetPassword(email: string, code: string, newPassword: string): Observable<any> {
    return from(confirmResetPassword({
      username: email, // Use email as username
      confirmationCode: code,
      newPassword
    })).pipe(
      map(result => {
        console.log('Password reset successfully:', result);
        return result;
      }),
      catchError(error => {
        console.error('Password reset error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  // ========== PRIVATE APIs (Authenticated) ==========

  /**
   * Get current authenticated user info
   */
  getCurrentUserInfo(): Observable<User> {
    return forkJoin({
      user: from((getCurrentUser())),
      attributes: from(fetchUserAttributes())
    }).pipe(
      map(data => {
        const userObj: User = {
          userId: data.user.userId,
          username: data.user.username,
          email: data.user.username,
          attributes: data.attributes
        };
        return userObj;
      })
    );
  }

  /**
   * Check if user is authenticated and get user info
   */
  checkUser(): Observable<User | null | any> {
    // Corrected and simplified logic
    return from(fetchAuthSession()).pipe(
      switchMap(session => {
        console.log("session: ", session);
        
        if (session.tokens?.accessToken) {
          // Return a new Observable that merges the user info and attributes
          return forkJoin({
            user: from(this.getCurrentUserInfo()),
            attributes: from(fetchUserAttributes())
          });
        } else {
          // Throw an error that will be caught by the catchError operator
          return throwError(() => new Error('No valid session'));
        }
      }),
      switchMap(data => {
        // Now you have access to both user and attributes from the forkJoin
        const user = data.user;
        const userAttributes = data.attributes;
        
        // Process the data as needed
        user.attributes = userAttributes; // Example: Add attributes to the user object
        
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
        console.log("user:", user);
        return of(user); // Return an observable with the final user object
      }),
      catchError(error => {
        console.log('User not authenticated:', error);
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return throwError(() => null);
      })
    );
  }

  /**
   * Update user attributes
   */
  updateUser(attributes: any): Observable<any> {
    return from(updateUserAttributes({
      userAttributes: attributes
    })).pipe(
      map(result => {
        // Refresh current user info
        this.checkUser().subscribe({
          next: () => console.log('User info refreshed after update'),
          error: (error) => console.error('Error refreshing user info:', error)
        });
        return result;
      }),
      catchError(error => {
        console.error('Update user error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Change password
   */
  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return from(updatePassword({
      oldPassword,
      newPassword
    })).pipe(
      map(result => {
        console.log('Password changed successfully:', result);
        return result;
      }),
      catchError(error => {
        console.error('Change password error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Delete user account
   */
  deleteUser(): Observable<any> {
    return from(deleteUser()).pipe(
      map(result => {
        console.log('User deleted successfully:', result);
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        return result;
      }),
      catchError(error => {
        console.error('Delete user error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  /**
   * Sign out user
   */
  signOut(): Observable<any> {
    return from(signOut()).pipe(
      map(result => {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
        console.log('User signed out successfully');
        return result;
      }),
      catchError(error => {
        console.error('Sign out error:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }

  // ========== UTILITY METHODS ==========

  /**
   * Check authentication status on service initialization
   */
  private checkAuthenticationStatus(): void {
    this.checkUser().subscribe({
      next: (user) => {
        if (user) {
          console.log('User is authenticated:', user);
        }
      },
      error: () => {
        console.log('No authenticated user found');
      }
    });
  }

  /**
   * Handle authentication errors
   */
  private handleAuthError(error: any): AuthError {
    // Map common AWS Amplify error codes
    const errorMap: { [key: string]: string } = {
      'UserNotFoundException': 'User not found',
      'NotAuthorizedException': 'Incorrect email or password',
      'UserNotConfirmedException': 'User not confirmed. Please check your email for verification code',
      'CodeMismatchException': 'Invalid verification code',
      'ExpiredCodeException': 'Verification code expired',
      'InvalidPasswordException': 'Password does not meet requirements',
      'UsernameExistsException': 'An account with this email already exists',
      'InvalidParameterException': 'Invalid parameter provided',
      'TooManyRequestsException': 'Too many requests. Please try again later'
    };

    const friendlyMessage = errorMap[error.name] || error.message || 'An unknown error occurred';

    return {
      code: error.name || error.code || 'UNKNOWN_ERROR',
      message: friendlyMessage
    };
  }

  /**
   * Get current user synchronously
   */
  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  /**
   * Check if user is authenticated synchronously
   */
  isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  /**
   * Get current user's email
   */
  getCurrentUserEmail(): string | null {
    const user = this.getCurrentUser();
    return user?.email || null;
  }

  /**
   * Get auth session tokens (useful for API calls)
   */
  getAuthSession(): Observable<any> {
    return from(fetchAuthSession()).pipe(
      map(session => ({
        accessToken: session.tokens?.accessToken?.toString(),
        idToken: session.tokens?.idToken?.toString(),
        isValid: !!session.tokens?.accessToken
      })),
      catchError(error => {
        console.error('Error getting auth session:', error);
        return throwError(() => this.handleAuthError(error));
      })
    );
  }
}