import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { User } from '../models/user.model';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService { 
  public user: User;

  constructor(private httpService: HttpService) {}

  public register(user) {
    return this.httpService.post('/register', user).toPromise();
  }

  public login(email, password) {
    return this.authenticate(email, password);
  }

  public authenticate(email, password) {
    return this.httpService
      .post('/authenticate', {
        email: email,
        password: password
      })
      .pipe(map((response:any) => {
        let user = response;
        this.onUserAuthenticated(user);
      }));
  }

  public onUserAuthenticated(user) {
    debugger
    if (user && user.token) {
      let data = {
        id: user.id,
        token: user.token
      };

      localStorage.setItem('currentUser', JSON.stringify(data));
      this.user = new User(user);
    }
  }

  public checkUser() {
    return new Promise((resolve, reject) => {
      if (this.user) {
        console.log('this.user', this.user);
        resolve(this.user);
        return true;
      }

      let currentUser = JSON.parse(localStorage.getItem('currentUser'));

      if (currentUser) {
        return this.httpService
          .getWithJwt('/check-user/' + currentUser.id)
          .pipe(map(
            (response: Response) => {
              let user = response;
              this.user = new User(user);

              resolve(this.user);
              return true;
            },
            error => {
              reject(error);
              return false;
            }
          ))
          .subscribe(
            () => {
              resolve(null);
              return false;
            },
            () => {
              resolve(null);
              return false;
            }
          );
      } else {
        resolve(null);
        return false;
      }
    });
  }

  public logout() {
    this.user = null;
    // remove user from local storage to log user out
    localStorage.removeItem('currentUser');
  }

  public sendResetPasswordRequest(email) {
    const payload = {
      email: email
    };

    return this.httpService
      .post('/password-reset-requests', payload)
      .toPromise();
  }

  public resetPassword(payload) {
    return this.httpService.post('/password-reset', payload).toPromise();
  }
}
