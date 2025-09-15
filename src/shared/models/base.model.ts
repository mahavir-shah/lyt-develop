import { Injectable } from '@angular/core';

import * as _ from 'lodash';

@Injectable()
export class BaseModel {
  constructor(data: Object) {
    if (_.isEmpty(data)) return;

    _.each(data, (value, key) => {
      this[key] = value;
    });
  }
}
