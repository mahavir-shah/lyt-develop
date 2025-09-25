import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { debounceTime } from 'rxjs/operators';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';

import {
  AlertFactory,
  AlertType,
  getValueOfAlertType
} from '../../../shared/factories/alert.factory';

import { LoginPage } from '../login/login';

import { AuthService } from '../../../shared/services/auth.service';
import { DeeplinksService } from '../../../shared/services/deeplinks.service';
import { ValidationService } from '../../../shared/services/validation.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'reset-password',
  templateUrl: 'reset-password.html',
  standalone: false,
})
export class ResetPasswordPage {
  public submitted: boolean = false;
  private confirmationCode: string  = "";
  private userEmail: string  = "";
  private strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).*$/;Ω

  public resetPasswordForm: FormGroup = new FormGroup({});

  private validationRules = {
    password: [
      'required',
      'maxlength',
      'validationPasswordMinglength',
      'pattern'
    ],
    password_confirmation: ['required', 'validatePasswordConfirm']
  };
  public validationErrors: any = {};

  constructor(
    private router: Router,
    private formBuilder: FormBuilder,
    private authService: AuthService,
    private alertFactory: AlertFactory,
    private deeplinksService: DeeplinksService,
    private translateService: TranslateService,
    public validationService: ValidationService,
    public navCtrl: NavController
  ) {
     const navigation = this.router.getCurrentNavigation();
      const state = navigation?.extras?.state;
      if (state?.['code'] && state?.['email']) {
        this.confirmationCode = state?.['code'];
        this.userEmail = state?.['email'];
      }
  }

  ngOnInit() {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  private initFormBuilder() {
    this.resetPasswordForm = this.formBuilder.group(
      {
        password: [
          '',
          Validators.compose([
            ValidationService.validatePasswordMinlength(8),
            Validators.maxLength(45),
            //ValidationService.validateOneNumberAndOneLetterPattern()
            Validators.pattern(this.strongPasswordPattern)
          ])
        ],
        password_confirmation: ['']
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
    this.resetPasswordForm.valueChanges.pipe(debounceTime(300)).subscribe(data => {
      this.validationService.checkForm(
        data,
        this.validationRules,
        this.validationErrors,
        this.resetPasswordForm,
        true
      );
    });
  }

  /*  public update(form, field) {
    this.validationService.checkForm(
      form.value,
      this.validationRules,
      this.validationErrors,
      form,
      true
    );

    if (form.controls[field].valid) {
      this.payload[field] = form.controls[field].value;
    }
  } */

  public resetPassword(): void {
    this.submitted = true;
    if (!this.resetPasswordForm.valid) {
      return;
    }
    
    this.authService.resetPassword( 
      this.userEmail,
      this.confirmationCode,
      this.resetPasswordForm?.value?.password
    ).subscribe(
      () => {
        this.handleSuccess();
      },
      () => {
        this.handleFail();
      }
    );
  }

  private handleSuccess(): void {
    this.createAlert(AlertType.Success, () => {
      this.navCtrl.navigateForward('/login-page');
    }).then(alert => {
      alert.present();
    });
  }

  private handleFail(): void {
    this.createAlert(AlertType.Fail, () => {
      this.navCtrl.navigateForward('/login-page');
    }).then(alert => {
      alert.present();
    });
  }

  private createAlert(type: AlertType, dismissHandler: Function): any {
    let alertTitle, alertMessage, alertButtonTitle;
    let alertTypeValue = getValueOfAlertType(type);

    this.translateService.get('common.ok').subscribe(value => {
      alertButtonTitle = value;
    });

    this.translateService
      .get(`reset_password.alert.${alertTypeValue}.title`)
      .subscribe(value => {
        alertTitle = value;
      });

    this.translateService
      .get(`reset_password.alert.${alertTypeValue}.message`)
      .subscribe(value => {
        alertMessage = value;
      });

    const alertButton = this.alertFactory.createButton(
      alertButtonTitle,
      dismissHandler
    );

    return this.alertFactory.createAlert(alertTitle, alertMessage, [
      alertButton
    ]);
  }
}
