import { Component, OnInit, OnDestroy } from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { debounceTime } from 'rxjs/operators';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';

import { AuthService } from '../../../shared/services/auth.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { AlertFactory } from '../../../shared/factories/alert.factory';

import { RegistrationPage } from '../registration/registration';
import { SearchInProgressPage } from '../../search-in-progress/search-in-progress';
import { ForgotPasswordPage } from '../forgot-password/forgot-password';
import { Subscription } from 'rxjs';
import { App } from '@capacitor/app';

@Component({
  selector: 'login',
  templateUrl: 'login.html',
  standalone: false,
})
export class LoginPage implements OnInit, OnDestroy {
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
    private alertFactory: AlertFactory,
    public validationService: ValidationService,
    private formBuilder: FormBuilder,
    public authService: AuthService
  ) {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  ngOnInit() {
    // Remove the old blocking behavior
  }

  ionViewWillEnter() {
    // Set up exit app confirmation on back button
    this.backButtonSubscription = this.platform.backButton
      .subscribeWithPriority(100, async () => {
        await this.showExitConfirmation();
      });
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

  /**
   * Show confirmation dialog before exiting app
   * Uses AlertFactory pattern consistent with the rest of the app
   */
  private async showExitConfirmation(): Promise<void> {
    const cancelButton = this.alertFactory.createDismissButton('Cancel', null);
    const exitButton = this.alertFactory.createButton('Exit', () => {
      this.exitApp();
    });

    const alert = await this.alertFactory.createAlert(
      'Exit Application',
      'Are you sure you want to close the app?',
      [cancelButton, exitButton]
    );

    await alert.present();
  }

  /**
   * Exit the application
   */
  private exitApp(): void {
    // Use Capacitor App plugin to exit
    App.exitApp();
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
        .loginUser(
          this.loginForm.controls['email'].value,
          this.loginForm.controls['password'].value
        )
        .subscribe(
          response => {
            this.navCtrl.navigateRoot('/search-inprogress-page');
          },
          error => {
            if (error) {
              this.invalidCredentials = true;
            }
          }
        );
    }
  }

  public goToForgotPasswordPage(): void {
    this.navCtrl.navigateForward('/forgot-password-page');
  }
}