import { Component, Input } from '@angular/core';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';
import { ValidationService } from '../../../shared/services/validation.service';
import { TranslateService } from '@ngx-translate/core';
import { NavController } from '@ionic/angular';
import { UsersService } from '../../../shared/services/users.service';
import { User } from '../../../shared/models/user.model';
import { AuthService } from '../../../shared/services';
import {
  AlertFactory,
  AlertType,
  getValueOfAlertType
} from '../../../shared/factories/alert.factory';
import cloneDeep from 'lodash/cloneDeep';
import { debounceTime } from 'rxjs';
import { Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'change-password',
  templateUrl: 'change-password.html',
  standalone: false,
})
export class ChangePassword {
  @Input()
  userPayload: any;

  public changePasswordForm: FormGroup = new FormGroup({});
  private validationRules = {
    old_password: ['required'],
    new_password: [
      'required',
      'validationOneNumberAndOneLetterPattern',
      'maxlength',
      'validationPasswordMinglength'
    ],
    new_password_confirmation: ['required', 'validatePasswordConfirm']
  };
  public validationErrors: any = {};
  public submitted:boolean = false;
  constructor(
    private formBuilder: FormBuilder,
    public validationService: ValidationService,
    private usersService: UsersService,
    private authService: AuthService,
    private location: Location,
    private translateService: TranslateService,
    private alertFactory: AlertFactory,
    private router: Router
  ) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    if (state?.['userPayload']) {
      this.userPayload = state?.['userPayload'];
    }
  }

  ngOnInit() {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  private initFormBuilder() {
    this.changePasswordForm = this.formBuilder.group(
      {
        old_password: [''],
        new_password: [
          '',
          Validators.compose([
            ValidationService.validatePasswordMinlength(8),
            Validators.maxLength(45),
            ValidationService.validateOneNumberAndOneLetterPattern()
          ])
        ],
        new_password_confirmation: ['']
      },
      {
        validator: this.validationService.checkIfMatchingPasswords(
          'new_password',
          'new_password_confirmation'
        )
      }
    );
  }

  private subscribeToFormChange() {
    this.changePasswordForm.valueChanges.pipe(debounceTime(300)).subscribe(data => {
      this.validationService.checkForm(
        data,
        this.validationRules,
        this.validationErrors,
        this.changePasswordForm,
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
      this.userPayload[field] = form.controls[field].value;
    }
  }

  public changePassword(data) {
    this.submitted = true;
    if (!this.changePasswordForm.valid) {
      return;
    }
    this.usersService.changePassword(this.userPayload).subscribe(
      response => {
        this.handleSuccess(new User(response));
      },
      error => {
        this.handleFail();
      }
    );
  }

  private handleSuccess(user: User): void {
    this.authService.user = cloneDeep(user);

    this.createAlert(AlertType.Success, () => {
      this.location.back();
    }).then(alert => {
      alert.present();
    });
  }

  private handleFail() {
    this.createAlert(AlertType.Fail, null).then(alert => {
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
      .get(`change_password.alert.${alertTypeValue}.title`)
      .subscribe(value => {
        alertTitle = value;
      });

    this.translateService
      .get(`change_password.alert.${alertTypeValue}.message`)
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
