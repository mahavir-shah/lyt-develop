import { Component, Inject } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';

import * as _ from 'lodash';

import { EnvVariables } from './../../../environments/enviroment-variables.token';
// /enviroment-variables.token';

import { AuthService } from '../../../shared/services/auth.service';
import { ValidationService } from '../../../shared/services/validation.service';

import { LoginPage } from '../login/login';
import { SearchInProgressPage } from '../../search-in-progress/search-in-progress';

@Component({
  selector: 'registration',
  templateUrl: 'registration.html',
  standalone: false,
})
export class RegistrationPage {
  public registrationForm: FormGroup;
  public submitted: boolean = false;

  private validationRules = {
    first_name: ['required', 'maxlength', 'validationText'],
    last_name: ['required', 'maxlength', 'validationText'],
    email: ['required', 'emailMaxlength', 'validationEmail'],
    password: [
      'required',
      'validationOneNumberAndOneLetterPattern',
      'maxlength',
      'validationPasswordMinglength'
    ],
    password_confirmation: ['required', 'validatePasswordConfirm']
  };
  public validationErrors: any = {};

  constructor(
    public navCtrl: NavController,
    private platform: Platform,
    private authService: AuthService,
    public validationService: ValidationService,
    private formBuilder: FormBuilder,
    @Inject(EnvVariables) public envVariables
  ) {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  ionViewDidLoad() {
    /* this.platform.registerBackButtonAction(event => {
      event.preventDefault();
    }, 100); */
    this.platform.backButton.subscribeWithPriority(100, () => {
      // This blocks default back button behavior
      // console.log('Back button pressed, default prevented.');
    });
  }

  private initFormBuilder() {
    this.registrationForm = this.formBuilder.group(
      {
        first_name: [
          '',
          Validators.compose([
            Validators.required,
            Validators.maxLength(45),
            ValidationService.validateText()
          ])
        ],
        last_name: [
          '',
          Validators.compose([
            Validators.required,
            Validators.maxLength(45),
            ValidationService.validateText()
          ])
        ],
        password: [
          '',
          Validators.compose([
            Validators.required,
            ValidationService.validatePasswordMinlength(8),
            Validators.maxLength(45),
            ValidationService.validateOneNumberAndOneLetterPattern()
          ])
        ],
        password_confirmation: ['', Validators.compose([Validators.required])],
        email: [
          '',
          Validators.compose([
            Validators.required,
            ValidationService.validateEmail(),
            ValidationService.validateEmailMaxlength(255)
          ])
        ]
      },
      {
        validator: this.validationService.checkIfMatchingPasswords(
          'password',
          'password_confirmation'
        )
      }
    );
  }

  private subscribeToFormChange() {
    this.registrationForm.valueChanges.pipe(debounceTime(300)).subscribe(data => {
      this.validationService.checkForm(
        data,
        this.validationRules,
        this.validationErrors,
        this.registrationForm,
        this.submitted
      );
    });
  }

  register(form) {
    this.submitted = true;
    this.validationService.checkForm(
      form.value,
      this.validationRules,
      this.validationErrors,
      form,
      this.submitted
    );
    if (form.valid) {
      this.authService.register(form.value).then(
        response => {
          this.authService.onUserAuthenticated(response);
          this.navCtrl.navigateRoot('/search-inprogress-page');
        },
        error => {
          this.validationErrors = _.first(error);
        }
      );
    }
  }

  goToLogin() {
    this.navCtrl.navigateForward('/login-page');
  }
}
