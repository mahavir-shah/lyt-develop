import { Injectable } from '@angular/core';

import { HttpService } from './http.service';

@Injectable()
export class UsersService {
  constructor(private httpService: HttpService) {}

  public updateUser(userPayload) {
    return this.httpService.putWithJwt('/users/' + userPayload.id, userPayload);
  }

  public deleteUser(user) {
    return this.httpService.deleteWithJwt('/users/' + user.id);
  }

  public changePassword(userPayload) {
    return this.httpService.putWithJwt(
      `/users/${userPayload.id}/change-password`,
      userPayload
    );
  }
}
