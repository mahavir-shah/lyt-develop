import { Injectable, Inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { EnvVariables } from './../../environments/enviroment-variables.token';


@Injectable({
  providedIn: 'root'
})

export class HttpService {
  private apiUrl: string;

  constructor(private http: HttpClient, @Inject(EnvVariables) public envVariables) {
    this.apiUrl = envVariables.apiEndpoint;
  }

  public get(url) {
    return this.http.get(this.apiUrl + url);
  }

  public post(url, data) {
    return this.http.post(this.apiUrl + url, data);
  }

  public put(url, data) {
    return this.http.put(this.apiUrl + url, data);
  }

  public delete(url) {
    return this.http.delete(this.apiUrl + url);
  }

  public getWithJwt(url) {
    return this.http.get(this.apiUrl + url, this.jwt());
  }

  public putWithJwt(url, data) {
    return this.http.put(this.apiUrl + url, data, this.jwt());
  }

  public deleteWithJwt(url) {
    return this.http.delete(this.apiUrl + url, this.jwt());
  }

  public postWithJwt(url, data) {
    return this.http.post(this.apiUrl + url, data, this.jwt());
  }

  private jwt() {
    let headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    const currentUser = JSON.parse(localStorage.getItem('currentUser')!);
    if (currentUser && currentUser.token) {
      headers = headers.set('Authorization', 'Bearer ' + currentUser.token);
    }

    return { headers: headers };
  }
}
