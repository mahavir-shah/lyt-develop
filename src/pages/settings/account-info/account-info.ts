import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Validators, FormBuilder, FormGroup } from '@angular/forms';

import { ValidationService } from '../../../shared/services/validation.service';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'account-info',
  templateUrl: 'account-info.html',
  standalone: false,
})
export class AccountInfo {
  @Input() userPayload: any;
  @Output() userPayloadChange = new EventEmitter<any>();

  public readonly: boolean = false;

  public accountForm: FormGroup = new FormGroup({});

  private validationRules = {
    first_name: ['required', 'maxlength', 'validationText'],
    last_name: ['required', 'maxlength', 'validationText'],
    email: ['required', 'emailMaxlength', 'validationEmail']
  };
  public validationErrors: any = {};

  constructor(
    private formBuilder: FormBuilder,
    public validationService: ValidationService
  ) {}

  ngOnInit() {
    this.initFormBuilder();
    this.subscribeToFormChange();
  }

  private initFormBuilder() {
    this.accountForm = this.formBuilder.group({
      first_name: [
        this.userPayload.first_name,
        Validators.compose([
          Validators.required,
          Validators.maxLength(45),
          ValidationService.validateText()
        ])
      ],
      last_name: [
        this.userPayload.last_name,
        Validators.compose([
          Validators.required,
          Validators.maxLength(45),
          ValidationService.validateText()
        ])
      ],
      email: [
        this.userPayload.email,
        Validators.compose([
          Validators.required,
          ValidationService.validateEmail(),
          ValidationService.validateEmailMaxlength(255)
        ])
      ],
      password: ['********', null]
    });
  }

  private subscribeToFormChange() {
    this.accountForm.valueChanges.pipe(debounceTime(300)).subscribe(data => {
      this.validationService.checkForm(
        data,
        this.validationRules,
        this.validationErrors,
        this.accountForm,
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
      this.userPayloadChange.emit(this.userPayload);
    }
  }
}
