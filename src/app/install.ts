import { Injectable, computed, signal } from '@angular/core';

// Chrome's offer to install the app. TypeScript's DOM types don't have it.
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

// After "Not now", how many more workout days until the install ask comes back, once.
export const ASK_AGAIN_AFTER = 3;

// Remembers small choices on this phone. Private browsing can refuse to.
function read(key: string): string | null {
  try {
    return localStorage.getItem(`rowreps.${key}`);
  } catch {
    return null;
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(`rowreps.${key}`, value);
  } catch {
    // Then the app asks again next time.
  }
}

@Injectable({ providedIn: 'root' })
export class Install {
  private readonly userAgent = navigator.userAgent;
  // An iPhone or iPad. iPads say they are Macs, but Macs have no touch screen.
  private readonly apple =
    /iPhone|iPad|iPod/.test(this.userAgent) ||
    (/Macintosh/.test(this.userAgent) && navigator.maxTouchPoints > 1);

  // Opened from the Home Screen icon rather than in a browser tab.
  readonly installed =
    matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true;
  // The installed app on an iPhone or iPad. It keeps its own copy of the workouts, apart from Safari's.
  readonly installedOnApple = this.apple && this.installed;
  // iPhone or iPad Safari, where the app is added from the Share menu. Other iOS browsers say so.
  readonly safari = this.apple && !this.installed && !/CriOS|FxiOS|EdgiOS/.test(this.userAgent);

  private readonly offer = signal<BeforeInstallPromptEvent | undefined>(undefined);
  // Android Chrome, once it offers to install the app.
  readonly promptable = computed(() => !!this.offer());
  readonly canInstall = computed(() => this.safari || this.promptable());

  readonly lineHidden = signal(read('install-line-hidden') === 'true');

  constructor() {
    addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      this.offer.set(event as BeforeInstallPromptEvent);
    });
    addEventListener('appinstalled', () => this.offer.set(undefined));
  }

  // Shows the browser's install dialog. Each offer can be shown once.
  async prompt(): Promise<void> {
    const offer = this.offer();
    this.offer.set(undefined);
    await offer?.prompt();
  }

  hideLine(): void {
    this.lineHidden.set(true);
    write('install-line-hidden', 'true');
  }

  // Ask after the first workout day, then once more ASK_AGAIN_AFTER workout days later.
  askDue(workoutDays: number): boolean {
    const asked = this.asked();
    return (
      workoutDays > 0 &&
      (!asked.length || (asked.length === 1 && workoutDays >= asked[0] + ASK_AGAIN_AFTER))
    );
  }

  asking(workoutDays: number): void {
    write('install-asked', JSON.stringify([...this.asked(), workoutDays]));
  }

  // The installed app asks to restore only on its first launch.
  restoreAsked(): boolean {
    return read('restore-asked') === 'true';
  }

  askingRestore(): void {
    write('restore-asked', 'true');
  }

  // The number of workout days there were at each ask.
  private asked(): number[] {
    return JSON.parse(read('install-asked') ?? '[]');
  }
}
