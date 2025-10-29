import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

import { Device } from '../../shared/models/device.model';

import { DevicesService } from '../../shared/services/devices.service';

import { ConnectionInProgressPage } from './../connection-in-progress/connection-in-progress';
import { SearchInProgressPage } from '../search-in-progress/search-in-progress';

@Component({
  selector: 'devices-list',
  templateUrl: 'devices-list.html',
  standalone: false,
})
export class DevicesListPage {
  constructor(
    public devicesService: DevicesService,
    public navCtrl: NavController
  ) {
    console.log("devicesService.devices:", devicesService.devices);
  }

  doRefresh(refresher) {
    this.navCtrl.navigateForward('/search-inprogress-page');
    refresher.complete();
  }

  public connectToDevice(device: Device) {
    this.navCtrl.navigateForward('/connection-inprogress-page', { 
      state: {
        device: device
      }
    });
  }
}
