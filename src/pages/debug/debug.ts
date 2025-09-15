import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';
import { FormBuilder, FormGroup } from '@angular/forms';

import { DevicesService } from '../../shared/services/devices.service';

@Component({
  selector: 'debug',
  templateUrl: 'debug.html',
  standalone: false,
})
export class DebugPage {
  private state = {
    characteristicUUID: '',
    characteristicValue: '',
    connectedDevice: null
  };

  public debugForm: FormGroup = new FormGroup({});

  constructor(
    private devicesService: DevicesService,
    private navCtrl: NavController,
    private formBuilder: FormBuilder
  ) {
    this.state.connectedDevice = devicesService.connectedDevice;
  }

  ngOnInit() {
    this.initFormBuilder();
  }

  private initFormBuilder() {
    this.debugForm = this.formBuilder.group({
      characteristicUUID: [this.state.characteristicUUID, null],
      characteristicValue: [this.state.characteristicValue, null]
    });
  }

  public updateField(field) {
    this.state[field] = this.debugForm.controls[field].value;
  }

  public writeCharacteristic() {
    const {
      characteristicUUID,
      characteristicValue,
      connectedDevice
    } = this.state;

    const parsedValue =
      characteristicValue.indexOf(',') > -1
        ? characteristicValue.split(',').map(x => parseInt(x))
        : parseInt(characteristicValue);

    connectedDevice.writeCharacteristic(characteristicUUID, parsedValue);
  }

  public readCharacteristic() {
    const { characteristicUUID, connectedDevice } = this.state;

    connectedDevice.readCharacteristic(characteristicUUID).then(buffer => {
      const array = new Uint8Array(buffer);

      let value = '';
      array.forEach(item => (value += `${item},`));
      value = value.slice(0, -1);

      this.state.characteristicValue = value;
      this.debugForm.patchValue({
        characteristicValue: value
      });
    });
  }
}
