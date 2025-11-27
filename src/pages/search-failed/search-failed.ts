import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController, AlertController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';

@Component({
  selector: 'search-failed',
  templateUrl: 'search-failed.html',
  standalone: false,
})
export class SearchFailedPage implements OnInit, OnDestroy {

  public from: string = '';

  // Method 1: Using snapshot (when params won't change)
  /* this.searchTerm = this.route.snapshot.queryParamMap.get('searchTerm') || '';
  this.category = this.route.snapshot.queryParamMap.get('category') || '' */

  private BackButtonSubscription?: Subscription;
  constructor(
    public navCtrl: NavController,
    private platform: Platform,
    private alertController: AlertController,
    private route: ActivatedRoute
  ) {}

  scan() {
    this.BackButtonSubscription.unsubscribe();
    this.navCtrl.navigateForward('/search-inprogress-page');
  }

  ngOnInit() {
    this.from = this.route.snapshot.queryParamMap.get('from') || '';
    console.log('SearchFailedPage initialized, from:', this.from); 
    this.setupHardwareBackButton();
  }

  private setupHardwareBackButton(): void {
    // Priority 9999 ensures this runs before other handlers
    this.BackButtonSubscription = this.platform.backButton.subscribeWithPriority(9999, async () => {
      const canLeave = await this.showDisconnectAlert();
      if (canLeave) {
        try {
          if (this.BackButtonSubscription) this.BackButtonSubscription.unsubscribe();
          console.log('User confirmed exit');
          this.exitApp();
        } catch (error) {
          console.error('Error while disconnecting', error);
        }
      }
      // If !canLeave, prevent default back behavior by doing nothing
    });
  }

  private async showDisconnectAlert(): Promise<boolean> {
    return new Promise(async (resolve) => {
      const alert = await this.alertController.create({
        header: 'Exit Application',
        cssClass: 'custom-color-alert',
        message: 'Are you sure you want to close the app?',
        backdropDismiss: false,
        buttons: [
          { text: 'No', role: 'cancel', handler: () => resolve(false) },
          { text: 'Exit', role: 'confirm', handler: () => resolve(true) }
        ]
      });
      await alert.present();
    });
  }

  /**
   * Exit app immediately (no confirmation)
   */
  exitApp(): void {
    if (this.platform.is('android')) {
      console.log('Exiting on Android');
      this.exitAndroid();
    } else if (this.platform.is('ios')) {
      console.log('Exiting on iOS');
      this.exitIOS();
    } else {
      console.log('Exiting on Web');
      this.exitWeb();
    }
  }

  /**
   * Android Exit - Uses Capacitor or Cordova
   */
  private exitAndroid(): void {
    // Method 1: Using Capacitor (Modern approach)
    if (typeof (window as any).Capacitor !== 'undefined') {
      const Capacitor = (window as any).Capacitor;
      Capacitor.Plugins?.App?.exitApp?.();
    }
  }

  /**
   * iOS Exit - Uses Capacitor or Cordova
   */
  private exitIOS(): void {
    // Method 1: Using Capacitor
    if (typeof (window as any).Capacitor !== 'undefined') {
      const Capacitor = (window as any).Capacitor;
      Capacitor.Plugins?.App?.exitApp?.();
    }
  }

  /**
   * Web Exit - Close browser window/tab
   */
  private exitWeb(): void {
    console.warn('Running on web - closing window');
    window.close();
  }

  ionViewWillEnter() {
    this.from = this.route.snapshot.queryParamMap.get('from') || '';
    console.log('SearchFailedPage initialized, from:', this.from); 

    if (this.BackButtonSubscription) this.BackButtonSubscription.unsubscribe();
    this.setupHardwareBackButton();
  }

  ionViewWillLeave() {
    if (this.BackButtonSubscription) this.BackButtonSubscription.unsubscribe();
  }

  ngOnDestroy() {
    console.log('SearchInProgressPage destroyed');
    if (this.BackButtonSubscription) this.BackButtonSubscription.unsubscribe();
  }
}
