import { Injectable } from '@angular/core';

import { Device } from '../models/device.model';

@Injectable({
  providedIn: 'root'
})
export class DevicesService {
  public devices: Device[] = [];
  /* public devices: any[] = [{
    id: "1",
    name: "test",
    rssi: 123,
    advertising: [1,1,2],
    services: ["abc", "xyz"],
    characteristics: ["abc"],
    ble: null
  }]; */
  public connectedDevice: Device;
  public currentPresetValue: any = {
    speed: 1.0,
    animation: 'Pulse',
    presetStatus: false,
    activeColor: null,
  };

  constructor() {}
}
