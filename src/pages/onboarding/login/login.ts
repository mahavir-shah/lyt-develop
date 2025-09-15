import { Component } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { debounceTime } from 'rxjs/operators';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';

import { AuthService } from '../../../shared/services/auth.service';
import { ValidationService } from '../../../shared/services/validation.service';

import { RegistrationPage } from '../registration/registration';
import { SearchInProgressPage } from '../../search-in-progress/search-in-progress';
import { ForgotPasswordPage } from '../forgot-password/forgot-password';
import { Subscription } from 'rxjs';

@Component({
  selector: 'login',
  templateUrl: 'login.html',
  standalone: false,
})
export class LoginPage {
  public invalidCredentials: boolean = false;
  public email: string;
  public password: string;
  public loginForm: FormGroup;
  public submitted: boolean = false;
  private validationRules = {
    email: ['required', 'emailMaxlength', 'validationEmail'],
    password: ['required', 'maxlength', 'validationPasswordMinglength']
  };
  public validationErrors: any = {};
  private backButtonSubscription?: Subscription;

  constructor(
    public navCtrl: NavController,
    private platform: Platform,
    public validationService: ValidationService,
    private formBuilder: FormBuilder,
    public authService: AuthService
  ) {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  ionViewDidLoad() {
    this.platform.backButton.subscribeWithPriority(100, () => {
      // This blocks default back button behavior
      // console.log('Back button pressed, default prevented.');
    });
  }

  private initFormBuilder() {
    this.loginForm = this.formBuilder.group({
      password: [
        '',
        Validators.compose([
          Validators.required,
          ValidationService.validatePasswordMinlength(8),
          Validators.maxLength(45)
        ])
      ],
      email: [
        '',
        Validators.compose([
          Validators.required,
          ValidationService.validateEmail(),
          ValidationService.validateEmailMaxlength(255)
        ])
      ]
    });
  }

  public ionViewCanEnter() {
    let currentUser = JSON.parse(localStorage.getItem('currentUser'));
    return !currentUser;
  }

  private subscribeToFormChange() {
    this.loginForm.valueChanges.pipe(debounceTime(300)).subscribe(data => {
      this.invalidCredentials = false;
      this.validationService.checkForm(
        data,
        this.validationRules,
        this.validationErrors,
        this.loginForm,
        this.submitted
      );
    });
  }

  public goToRegistration() {
    this.navCtrl.navigateForward('/register-page');
  }

  public login() {
    this.submitted = true;
    this.validationService.checkForm(
      this.loginForm.value,
      this.validationRules,
      this.validationErrors,
      this.loginForm,
      this.submitted
    );
    if (this.loginForm.valid) {
      this.authService
        .login(
          this.loginForm.controls['email'].value,
          this.loginForm.controls['password'].value
        )
        .subscribe(
          response => {
            this.navCtrl.navigateRoot('/search-inprogress-page');
          },
          error => {
            if (error && error.status === 401) {
              this.invalidCredentials = true;
            }
          }
        );
    }
  }

  public goToForgotPasswordPage(): void {
    this.navCtrl.navigateForward('/forgot-passwor-page');
  }
}
