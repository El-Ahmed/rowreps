import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, I18nPluralPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiButton, TuiCell, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiSheetDialog } from '@taiga-ui/addon-mobile';
import { backupFile, download, file, spreadsheet } from '../backup';
import { Install } from '../install';
import { InstallSheet } from '../install-sheet/install-sheet';
import { Restore } from '../restore/restore';
import { Sessions } from '../sessions';

@Component({
  selector: 'app-settings',
  imports: [
    DatePipe,
    I18nPluralPipe,
    InstallSheet,
    Restore,
    RouterLink,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiIcon,
    TuiSheetDialog,
    TuiTitle,
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly sessions = inject(Sessions);
  protected readonly install = inject(Install);

  protected readonly count = computed(() => this.sessions.all()?.length ?? 0);
  protected readonly firstDate = computed(() => this.sessions.all()?.at(-1)?.date);
  protected readonly exporting = signal(false);
  protected readonly installing = signal(false);

  protected readonly workouts = { '=1': '1 workout', other: '# workouts' };

  // iPhone shows how to add it to the Home Screen, Android shows its own install dialog.
  protected installApp(): void {
    if (this.install.safari) {
      this.installing.set(true);
    } else {
      this.install.prompt();
    }
  }

  protected async exportBackup(): Promise<void> {
    download(await backupFile());
    this.exporting.set(false);
  }

  protected exportSpreadsheet(): void {
    download(file('workouts', 'csv', 'text/csv', spreadsheet(this.sessions.all() ?? [])));
    this.exporting.set(false);
  }
}
