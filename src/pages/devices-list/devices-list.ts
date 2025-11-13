import { Component } from '@angular/core';
import { NavController } from '@ionic/angular';

import { Device } from '../../shared/models/device.model';

import { DevicesService } from '../../shared/services/devices.service';

import { ConnectionInProgressPage } from './../connection-in-progress/connection-in-progress';
import { SearchInProgressPage } from '../search-in-progress/search-in-progress';

@Component({
  selector: 'devices-list',
  templateUrl: 'devices-list.html',
  styleUrl: 'devices-list.scss',
  standalone: false,
})
export class DevicesListPage {
  showOnlyLyt: boolean = true;  // slider ON by default
  filteredDevices = [];
  constructor(
    public devicesService: DevicesService,
    public navCtrl: NavController
  ) {
    console.log("devicesService.devices:", devicesService.devices);
  }

  ngOnInit() {
    this.filterDevices();
  }

  // Keep or add this helper to filter the visible list
  filterDevices() {
    const list = (this.devicesService && this.devicesService.devices) ? this.devicesService.devices : [];
    if (this.showOnlyLyt) {
      this.filteredDevices = list.filter(d =>
        !!(d?.device?.name && d.device.name.toLowerCase().includes('lyt'))
      );
    } else {
      this.filteredDevices = [...list];
    }
  }

  async doRefresh(event: any) {
    this.navCtrl.navigateForward('/search-inprogress-page');
    event.complete();
  }

  public connectToDevice(device: Device) {
    this.navCtrl.navigateForward('/connection-inprogress-page', {
      state: {
        device: device
      }
    });
  }
}
