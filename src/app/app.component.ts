import { Platform, NavController } from '@ionic/angular';
// Capacitor Plugins
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';

// CapAwesome Plugins
import { OrientationType, ScreenOrientation } from '@capawesome/capacitor-screen-orientation';

// Capacitor Community Plugin for Bluetooth
import { BleClient } from '@capacitor-community/bluetooth-le';

// ngx-translate
import { TranslateService } from '@ngx-translate/core';
import { Component } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';

import * as _ from 'lodash';

import { AuthService } from '../shared/services/auth.service';
import { DeeplinksService } from '../shared/services/deeplinks.service';
import { DiagnosticService } from '../shared/services/diagnostic.service';

import { LoginPage } from '../pages/onboarding/login/login';
import { SearchInProgressPage } from '../pages/search-in-progress/search-in-progress';
import { ColorPickerPage } from '../pages/color-picker/color-picker';
import { BluetoothFailedPage } from '../pages/bluetooth-failed/bluetooth-failed';
import { AccountSettingsPreviewPage } from '../pages/settings/account-settings-preview/account-settings-preview';
import { ResetPasswordPage } from '../pages/onboarding/forgot-password/reset-password';
import { LocationDisabledPage } from '../pages/location-disabled/location-disabled';
import { filter } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent {
  private isLocationEnabled: any;
  private isBluetoothEnabled: any;

  public currentRoute: string = '';

  constructor(
    private platform: Platform,
    private navCtrl: NavController,
    //private deeplinks: Deeplinks,
    private authService: AuthService,
    private deeplinksService: DeeplinksService,
    private diagnosticService: DiagnosticService,
    private translate: TranslateService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    translate.use('en');
      this.initializeApp();

    platform.ready().then(() => {
      if (Capacitor.isNativePlatform()) {
        ScreenOrientation.lock({ type: OrientationType.PORTRAIT })
      }
    });

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.urlAfterRedirects;
    });
  }

  ngOnInit() {
    console.log('ng on init initialize..')
    this.authService.checkUser().subscribe({
      next: (user) => {
        if (user) {
          BleClient.isEnabled()
          .then(() => {
            this.checkIfLocationIsEnabled().then(isEnabled => {
              if(isEnabled) {
                this.router.navigateByUrl('/search-inprogress-page');
              } else {
                this.router.navigateByUrl('/location-disabled-page');
              }
            });
          })
          .catch(() => {
            this.router.navigateByUrl('/bluetooth-failed');
          });
          //this.navCtrl = app.getActiveNav();
          this.configureDeeplinks();
          this.subscribeToBluetoothAndLocationChanges();
          this.platformReady();
        } else {
          this.platformReady();
          this.router.navigateByUrl('/login-page');
        }
      },
      error: (error) => {
        // handle error
      }
    });

    App.addListener('appUrlOpen', ({ url }) => {
      // For reset password deeplink
      if(url.includes("password-reset?id=")) {
        const parsedUrl = new URL(url);

        // Get the value of a specific query parameter (e.g., 'id')
        const code = parsedUrl.searchParams.get('id');
        const email = parsedUrl.searchParams.get('user');
        
        console.log('Deep link URL:', url);
        console.log('Confirmation code:', code);

        this.navCtrl.navigateForward('/reset-password-page', {
          state: {
            code: atob(code),
            email: email            
          }
        });
      }
    });
  }

  /* private platformReady(statusBar: StatusBar, splashScreen: SplashScreen) {
    statusBar.styleLightContent();
    splashScreen.hide();
  } */

  async checkIfLocationIsEnabled(): Promise<boolean> {
    try {
      // Try to get current position
      await Geolocation.getCurrentPosition();
      return true;
    } catch (error: any) {
      console.error('Location check failed:', error);
      return false;
    }
  }

  private initializeApp() {
    this.platform.ready().then(() => {
      this.platformReady();
    });
  }

  private async platformReady(): Promise<void> {
    try {
      // Set status bar to light content (e.g., white text on dark background)
      if (Capacitor.isNativePlatform()) {
        await StatusBar.setStyle({ style: Style.Light });
        await SplashScreen.hide();
      }

      // Hide the splash screen

      console.log('Platform ready: StatusBar and SplashScreen configured');
    } catch (error) {
      console.error('Error during platform initialization:', error);
    }
  }


  private configureDeeplinks(): void {
    /* this.deeplinks
      .routeWithNavController(this.navCtrl, {
        '/password-reset': ResetPasswordPage
      })
      .subscribe(match => {
        this.deeplinksService.data = {
          id: parseInt(match.$link.queryString.split('=')[1])
        };
      }); */
  }

  private subscribeToBluetoothAndLocationChanges(): void {
    this.diagnosticService.isLocationEnabled.subscribe((isEnabled: any) => {
      this.isLocationEnabled = isEnabled;
      this.handleSubscriptions();
    });

    this.diagnosticService.isBluetoothEnabled.subscribe((isEnabled: any) => {
      this.isBluetoothEnabled = isEnabled;
      this.handleSubscriptions();
    });
  }

  private handleSubscriptions(): void {
    if (!this.isLocationEnabled || !this.isBluetoothEnabled) {
      return;
    }

    if (this.getRootPage() === LoginPage || this.isAccountSettingsOnScreen() || this.deviceConnectProcessPage()) {
      return;
    }

    if (
      !this.isBluetoothEnabled.current &&
      !this.isPageCurrentlyActive(BluetoothFailedPage)
    ) {
      this.navCtrl.navigateRoot('/bluetooth-failed');
      return;
    }

    if (
      !this.isLocationEnabled.current &&
      !this.isPageCurrentlyActive(LocationDisabledPage)
    ) {
      if (!this.isBluetoothEnabled.current) {
        return;
      }

      this.navCtrl.navigateRoot('/location-disabled-page');
      return;
    }

    if (
      this.isLocationEnabled.current &&
      this.isBluetoothEnabled.current &&
      !this.isPageCurrentlyActive(SearchInProgressPage)
    ) {
      if (
        this.getRootPage() === SearchInProgressPage ||
        this.getRootPage() === ColorPickerPage
      ) {
        return;
      }

      this.navCtrl.navigateRoot('/search-inprogress-page');
    }
  }

  private isAccountSettingsOnScreen(): boolean {
    return this.router.url.includes('/account-settings-preview') || 
        this.router.url.includes('/account-settings-edit-page') || 
        this.router.url.includes('/change-password-page') ||
        this.router.url.includes('/delete-account-page') ; // adjust the path accordingly
  }

  private deviceConnectProcessPage(): boolean {
    return this.router.url.includes('/devices-list') || 
        this.router.url.includes('/search-inprogress-page') || 
        this.router.url.includes('/connection-inprogress-page') ||
        this.router.url.includes('/connection-failed') ||
        this.router.url.includes('/device-connected-page') ||
        this.router.url.includes('/search-failed-page') ||
        this.router.url.includes('/bluetooth-failed') ||
        this.router.url.includes('/color-picker-page') ||
        this.router.url.includes('/debug-page') ||
        this.router.url.includes('/confirmation-sent-page') ||
        this.router.url.includes('/presets-page')
  }

  private isPageCurrentlyActive(page: any): boolean {
    return this.currentRoute === page;
    // return this.navCtrl.getActive().component === page;
  }

  private getRootPage(): any {
    return this.router.config[0].path;
  }
}
