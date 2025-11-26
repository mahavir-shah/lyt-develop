
import { Injectable } from '@angular/core';
import { Platform } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class PlatformDetectionService {
  isAndroid = false;
  isIOS = false;
  androidVersion = 0;
  iosVersion = 0;
  hasNotch = false;

  constructor(private platform: Platform) {
    this.detectPlatform();
  }

  private detectPlatform(): void {
    const userAgent = navigator.userAgent.toLowerCase();

    // Detect Android
    if (this.platform.is('android') || userAgent.includes('android')) {
      this.isAndroid = true;
      this.parseAndroidVersion(userAgent);
      console.log('Platform: Android', this.androidVersion);
    }

    // Detect iOS
    if (this.platform.is('ios') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
      this.isIOS = true;
      this.parseIOSVersion(userAgent);
      this.detectIOSNotch();
      console.log('Platform: iOS', this.iosVersion);
    }

    // Log detection results
    console.log('Platform Detection:', {
      isAndroid: this.isAndroid,
      isIOS: this.isIOS,
      androidVersion: this.androidVersion,
      iosVersion: this.iosVersion,
      hasNotch: this.hasNotch
    });
  }

  private parseAndroidVersion(userAgent: string): void {
    const match = userAgent.match(/android\s([\d.]+)/);
    if (match) {
      this.androidVersion = parseFloat(match[1]);
    }
  }

  private parseIOSVersion(userAgent: string): void {
    const match = userAgent.match(/os\s([\d_]+)/);
    if (match) {
      const versionString = match[1].replace(/_/g, '.');
      this.iosVersion = parseFloat(versionString);
    }
  }

  private detectIOSNotch(): void {
    // Check for notch using env() CSS variable
    if (typeof window !== 'undefined') {
      const style = getComputedStyle(document.documentElement);
      const topInset = style.getPropertyValue('env(safe-area-inset-top)');
      this.hasNotch = topInset && parseFloat(topInset) > 20;
      console.log('iOS Notch detected:', this.hasNotch);
    }
  }

  /**
   * Get safe area values
   */
  getSafeAreaInsets() {
    if (typeof window === 'undefined') {
      return { top: 0, bottom: 0, left: 0, right: 0 };
    }

    const style = getComputedStyle(document.documentElement);
    
    const parseValue = (value: string): number => {
      const match = value.match(/(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    };

    return {
      top: parseValue(style.getPropertyValue('--ion-safe-area-top')),
      bottom: parseValue(style.getPropertyValue('--ion-safe-area-bottom')),
      left: parseValue(style.getPropertyValue('--ion-safe-area-left')),
      right: parseValue(style.getPropertyValue('--ion-safe-area-right'))
    };
  }

  /**
   * Apply platform-specific adjustments
   */
  applyPlatformStyles(): void {
    if (this.isIOS) {
      console.log('Applying iOS styles');
      document.documentElement.classList.add('platform-ios');
    }

    if (this.isAndroid) {
      console.log('Applying Android styles');
      document.documentElement.classList.add('platform-android');
      
      // Add Android version class
      document.documentElement.classList.add(`android-v${Math.floor(this.androidVersion)}`);
    }
  }

  /**
   * Check if platform is affected by specific bugs
   */
  isAffectedByAndroid13Bug(): boolean {
    return this.isAndroid && (this.androidVersion === 13 || this.androidVersion === 14);
  }

  /**
   * Get platform info for debugging
   */
  getPlatformInfo() {
    return {
      platform: this.isIOS ? 'iOS' : this.isAndroid ? 'Android' : 'Unknown',
      version: this.isIOS ? this.iosVersion : this.androidVersion,
      hasNotch: this.hasNotch,
      safeAreaInsets: this.getSafeAreaInsets()
    };
  }
}