import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { Platform, NavController } from '@ionic/angular';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { debounceTime } from 'rxjs/operators';
import { Subscription } from 'rxjs';

import * as _ from 'lodash';

import { EnvVariables } from './../../../environments/enviroment-variables.token';

import { AuthService } from '../../../shared/services/auth.service';
import { ValidationService } from '../../../shared/services/validation.service';

import { LoginPage } from '../login/login';
import { SearchInProgressPage } from '../../search-in-progress/search-in-progress';

@Component({
  selector: 'registration',
  templateUrl: 'registration.html',
  standalone: false,
})
export class RegistrationPage implements OnInit, OnDestroy {
  public registrationForm: FormGroup;
  public submitted: boolean = false;
  private strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;

  private validationRules = {
    first_name: ['required', 'maxlength', 'validationText'],
    last_name: ['required', 'maxlength', 'validationText'],
    email: ['required', 'emailMaxlength', 'validationEmail'],
    password: [
      'required',
      'maxlength',
      'validationPasswordMinglength',
      'pattern'
    ],
    password_confirmation: ['required', 'validatePasswordConfirm']
  };
  public validationErrors: any = {};
  private backButtonSubscription?: Subscription;

  constructor(
    public navCtrl: NavController,
    private platform: Platform,
    public validationService: ValidationService,
    private formBuilder: FormBuilder,
    public authService: AuthService,
    @Inject(EnvVariables) public envVariables
  ) {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  ngOnInit() {
    // Removed blocking behavior - now handled in ionViewWillEnter
  }

  ionViewWillEnter() {
    // Only handle Android back button (iOS uses swipe gestures)
    if (this.platform.is('android')) {
      this.backButtonSubscription = this.platform.backButton
        .subscribeWithPriority(100, () => {
          // Navigate back to login page
          this.goToLogin();
        });
    }
  }

  ionViewWillLeave() {
    // Clean up subscription when leaving page
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
  }

  ngOnDestroy() {
    // Backup cleanup
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
    }
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
            Validators.pattern(this.strongPasswordPattern)
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
      this.authService.registerUser(form.value).subscribe(
        (response:any) => {
          if (response.isSignUpComplete && response.userId) {
            this.loginUser(form.value.email, form.value.password);  
          }
        },
        error => {
          console.log("error:", error?.message)
          if(error?.message) {
            this.validationErrors ={email: error?.message };
          } else {
            this.validationErrors ={email: "Email address already registerd" };
          }
        }
      );
    }
  }

  loginUser(email, password) {
    this.authService.loginUser(email, password).subscribe(response => {
        this.navCtrl.navigateRoot('/search-inprogress-page');
      },
      error => {
        if (error) {
          console.log("error:", error);
        }
      }
    );
  }

  goToLogin() {
    this.navCtrl.navigateBack('/login-page');
  }
}