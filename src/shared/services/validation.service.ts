import { Injectable } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';

import * as _ from 'lodash';

@Injectable()
export class ValidationService {
  public validationMessages = {
    required: 'This field is required.',
    validationText: 'This field must be a text.',
    maxlength: 'This field cannot exceed 45 characters.',
    validationEmailMaxlength: 'This field cannot exceed 255 characters.',
    minlength: 'This field must be at least 2 characters long.',
    validationPasswordMinglength:
      'This field must be at least 8 characters long.',
    email: 'Email field is invalid.',
    validationEmail: 'The email field must be a valid email.',
    validationOneNumberAndOneLetterPattern:
      'This field must contain at least one letter and one number.',
    validatePasswordConfirm: 'Password do not match.',
    pattern: 'Must include at least one uppercase letter, one lowercase letter, one number, and one special character.'
  };

  constructor() {}

  isInvalid(form, fieldName, submitted) {
    return (
      !form.controls[fieldName].valid &&
      (form.controls[fieldName].dirty || submitted)
    );
  }

  checkForm(formData, rules, errors, form, submitted) {
    _.forOwn(formData, (value, key) => {
      this.checkField(key, rules, errors, form, submitted);
    });
  }

  checkField(field: string, rules: any, errors: any, form: any, submitted: boolean): void {
    if(errors && errors?.[field]) {
      errors[field] = null;
    }

    _.some(rules[field], (validationRule: string) => {
      if (
        form.controls[field].hasError(validationRule) &&
        (form.controls[field].touched || submitted)
      ) {
        errors[field] = this.validationMessages[validationRule];
        return true; // Breaks the _.some loop
      }
      return false;
    });
  }

  public static validateText() {
    let STRING_REGEXP = RegExp(/^[a-zA-Z\s]*$/);

    return (c: FormControl) => {
      return c.value && STRING_REGEXP.test(c.value)
        ? null
        : {
            validationText: true
          };
    };
  }

  public static validateEmailMaxlength(value) {
    return (c: FormControl) => {
      return c.value && c.value.length <= value
        ? null
        : {
            validationEmailMaxlength: true
          };
    };
  }

  public static validateEmail() {
    return (c: FormControl) => {
      let EMAIL_REGEXP = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
      return EMAIL_REGEXP.test(c.value)
        ? null
        : {
            validationEmail: true
          };
    };
  }

  public static validatePasswordMinlength(value) {
    return (c: FormControl) => {
      return c.value && c.value.length >= value
        ? null
        : {
            validationPasswordMinglength: true
          };
    };
  }

  public static validateOneNumberAndOneLetterPattern() {
    let STRING_REGEXP = RegExp(/^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+)$/);

    return (c: FormControl) => {
      return c.value && STRING_REGEXP.test(c.value)
        ? null
        : {
            validationOneNumberAndOneLetterPattern: true
          };
    };
  }

  public checkIfMatchingPasswords(
    passwordKey: string,
    passwordConfirmationKey: string
  ) {
    return (group: FormGroup) => {
      let passwordInput = group.controls[passwordKey],
        passwordConfirmationInput = group.controls[passwordConfirmationKey];

      if (passwordInput.value !== passwordConfirmationInput.value) {
        this.setValidatePasswordErrors(passwordConfirmationInput);
      } else {
        this.removeValidatePasswordErrors(passwordConfirmationInput);
      }
    };
  }

  private setValidatePasswordErrors(passwordConfirmationInput) {
    if (passwordConfirmationInput.errors) {
      passwordConfirmationInput.errors['validatePasswordConfirm'] = true;
    } else {
      passwordConfirmationInput.setErrors({ validatePasswordConfirm: true });
    }
  }

  private removeValidatePasswordErrors(passwordConfirmationInput) {
    if (passwordConfirmationInput.errors) {
      passwordConfirmationInput.errors['validatePasswordConfirm'] = null;
    }
  }
}
