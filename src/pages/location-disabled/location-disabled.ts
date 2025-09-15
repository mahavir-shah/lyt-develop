import { Component } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import { Device } from '@capacitor/device';
import { Preferences } from '@capacitor/preferences';

@Component({
  selector: 'location-disabled',
  templateUrl: 'location-disabled.html',
  standalone: false,
})
export class LocationDisabledPage {
  platform: string = '';

  constructor() {
    this.initPlatform();
  }

  private async initPlatform() {
    const info = await Device.getInfo();
    this.platform = info.platform;
  }

  public async showLocationSettings(): Promise<void> {
    try {
      const permissionStatus = await Geolocation.checkPermissions();

      if (permissionStatus.location === 'granted') {
        const position = await Geolocation.getCurrentPosition();
        console.log('Location:', position.coords);
        alert('Location access is already granted.');
        return;
      }

      // Request permission
      const newStatus = await Geolocation.requestPermissions();

      if (newStatus.location === 'granted') {
        const position = await Geolocation.getCurrentPosition();
        console.log('New location:', position.coords);
        return;
      }

      // If permission still denied
      this.promptToOpenSettings();
    } catch (error) {
      console.error('Error accessing location:', error);
      this.promptToOpenSettings();
    }
  }

  private promptToOpenSettings(): void {
    if (this.platform === 'android') {
      // Android: open app settings directly
      window.open('app-settings:', '_system');
    } else if (this.platform === 'ios') {
      // iOS: cannot open settings programmatically
      alert('Please open Settings > Privacy > Location Services and enable location access for this app.');
    } else {
      alert('Unsupported platform or unable to open settings.');
    }
  }
}
