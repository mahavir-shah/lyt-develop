// src/app/services/back-button.service.ts

import { Injectable, NgZone } from '@angular/core';
import { Platform } from '@ionic/angular';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class BackButtonService {
  
  // Storage for the current handler function
  private customHandler: (() => void) | null = null;

  constructor(
    private platform: Platform,
    private router: Router,
    private ngZone: NgZone // Important for running code inside Angular's zone
  ) {
    this.setupGlobalHandler();
  }

  // 1. Set up the single, persistent global listener
  private setupGlobalHandler() {
    // Priority 99 is high enough to override default navigation
    this.platform.backButton.subscribeWithPriority(99, () => {
      this.ngZone.run(() => {
        // 2. Execute the component-specific handler if one is registered
        if (this.customHandler) {
          this.customHandler();
        } else {
            window.history.back();
        }
      });
    });
  }

  /**
   * Components call this to register their custom back button logic.
   * @param handler A function containing the component's custom action (e.g., show alert).
   */
  registerHandler(handler: () => void): void {
    this.customHandler = handler;
  }

  /**
   * Components call this to remove their custom logic when they leave.
   */
  unregisterHandler(): void {
    this.customHandler = null;
  }
}