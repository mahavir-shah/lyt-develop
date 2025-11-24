import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { NavController, Platform } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { UrlTrackingService } from 'src/shared/services/url-tracking.service';

@Component({
  selector: 'navbar',
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss'],
  standalone: false
})

export class LytNavbar implements OnInit, OnChanges, OnDestroy {
  public defaultHref?: string = '/';
  public backButtonText?: string = '';
  @Input() title: string = '';
  @Input() hideBackButton: boolean = false;
  @Input() customBackAction: boolean = false;
  @Input() showLogo: boolean = false;
  @Input() hideSettingsButton: boolean = false;
  @Input() customClass: string = '';
  @Input() customButtonTitle: string = '';
  @Input() showCustomButton: boolean = false;
  @Input() isRightSideEmpty: boolean = false;

  @Output() onCustomButtonClick = new EventEmitter<void>();
  @Output() onBackButtonClick = new EventEmitter<void>();

  private backButtonSubscription: Subscription | null = null;

  constructor(
    private navCtrl: NavController, 
    public platform: Platform,
    private location: Location,
    private router: Router,
    private urlTrackingService: UrlTrackingService
    
  ) {}

  ngOnInit() {
    this.setBackButtonAction(this.customBackAction);
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['customBackAction']) {
      this.setBackButtonAction(changes['customBackAction'].currentValue);
    }
  }

  ngOnDestroy() {
    this.removeBackButtonAction();
  }

  private setBackButtonAction(enabled: boolean) {
    this.removeBackButtonAction();

    if (enabled) {
      this.backButtonSubscription = this.platform.backButton.subscribeWithPriority(
        9999,
        () => {
          this.onBackButtonClick.emit();
        }
      );
    }
  }

  private removeBackButtonAction() {
    if (this.backButtonSubscription) {
      this.backButtonSubscription.unsubscribe();
      this.backButtonSubscription = null;
    }
  }

  public scan() {
    this.navCtrl.navigateForward('/search-in-progress');
  }

  public goToSettings() {
    this.navCtrl.navigateForward('/account-settings-preview');
  }

  public customButtonClicked() {
    this.onCustomButtonClick.emit();
  }

  public goBack() {
    const currentRoute = this.router.url;
    const previousUrl = this.urlTrackingService.getPreviousUrl();
    console.log('currentRoute:', currentRoute, 'previousUrl:', previousUrl);
    if (currentRoute.includes('/presets-page')) {
      this.navCtrl.navigateForward('/color-picker-page');
      return;
    } else if (previousUrl == '/color-picker-page') {
      this.navCtrl.navigateForward('/color-picker-page');
      return;
    } else {
      this.location.back();
    }
  }
}
