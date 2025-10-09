import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { debounceTime } from 'rxjs/operators';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import { AlertFactory } from '../../../shared/factories/alert.factory';

import { ConfirmationSentPage } from './confirmation-sent';

import { AuthService } from '../../../shared/services/auth.service';
import { ValidationService } from '../../../shared/services/validation.service';

@Component({
  selector: 'forgot-password',
  templateUrl: 'forgot-password.html',
  standalone: false,
})
export class ForgotPasswordPage {
  public resetPasswordEmailForm: FormGroup = new FormGroup({});

  private email: string;

  private validationRules = {
    email: ['required', 'emailMaxlength', 'validationEmail']
  };
  public validationErrors: any = {};

  constructor(
    private authService: AuthService,
    private formBuilder: FormBuilder,
    private alertFactory: AlertFactory,
    private translateService: TranslateService,
    public navCtrl: NavController,
    public validationService: ValidationService
  ) {}

  ngOnInit() {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  private initFormBuilder() {
    this.resetPasswordEmailForm = this.formBuilder.group({
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
    this.resetPasswordEmailForm.valueChanges
      .pipe(debounceTime(300))
      .subscribe(data => {
        this.validationService.checkForm(
          data,
          this.validationRules,
          this.validationErrors,
          this.resetPasswordEmailForm,
          true
        );
      });
  }

  public update(form, field) {
    this.validationService.checkForm(
      form.value,
      this.validationRules,
      this.validationErrors,
      form,
      true
    );

    if (form.controls[field].valid) {
      this.email = form.controls[field].value;
    }
  }

  public sendResetPasswordRequest(): void {
    this.authService.requestPasswordReset(this.email).subscribe(
      () => {
        this.navCtrl.navigateForward('/reset-password-page', { 
          state: {
            email: this.email
          }
        });
      },
      () => {
        this.createAlert().then(alert => {
          alert.present();
        });
      }
    );
  }

  private createAlert(): any {
    let alertTitle, alertMessage, alertButtonTitle;

    this.translateService.get('common.ok').subscribe(value => {
      alertButtonTitle = value;
    });

    this.translateService
      .get(`forgot_password.alert.fail.title`)
      .subscribe(value => {
        alertTitle = value;
      });

    this.translateService
      .get(`forgot_password.alert.fail.message`)
      .subscribe(value => {
        alertMessage = value;
      });

    const alertButton = this.alertFactory.createButton(alertButtonTitle, null);

    return this.alertFactory.createAlert(alertTitle, alertMessage, [
      alertButton
    ]);
  }
}
