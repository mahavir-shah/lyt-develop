import { Injectable } from '@angular/core';

import { BaseModel } from './base.model';

@Injectable()
export class User extends BaseModel {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  token: string;
}
