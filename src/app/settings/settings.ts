import {
  Component,
  DOCUMENT,
  TemplateRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DatePipe, I18nPluralPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiCell, TuiDialogService, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiAvatar } from '@taiga-ui/kit';
import { TuiSheetDialog } from '@taiga-ui/addon-mobile';
import { filter } from 'rxjs';
import { Backup, backup, parseBackup, restore, spreadsheet } from '../backup';
import { Sessions } from '../sessions';

@Component({
  selector: 'app-settings',
  imports: [
    DatePipe,
    I18nPluralPipe,
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
  private readonly dialogs = inject(TuiDialogService);
  private readonly document = inject(DOCUMENT);
  private readonly restoreText = viewChild.required<TemplateRef<unknown>>('restoreText');

  protected readonly count = computed(() => this.sessions.all()?.length ?? 0);
  protected readonly firstDate = computed(() => this.sessions.all()?.at(-1)?.date);
  protected readonly exporting = signal(false);

  protected readonly workouts = { '=1': '1 workout', other: '# workouts' };
  protected readonly kept = {
    '=1': '1 day you already have on this phone stays as it is.',
    other: '# days you already have on this phone stay as they are.',
  };
  protected readonly newDays = { '=1': '1 new day', other: '# new days' };

  // What the restore alert says about the picked file.
  protected readonly restoring = signal({ file: '', added: 0, kept: 0 });

  protected async exportBackup(): Promise<void> {
    this.download('backup', 'json', 'application/json', JSON.stringify(await backup()));
  }

  protected exportSpreadsheet(): void {
    this.download('workouts', 'csv', 'text/csv', spreadsheet(this.sessions.all() ?? []));
  }

  protected async pick(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    // Lets the same file be picked again.
    input.value = '';
    if (!file) {
      return;
    }
    const data = parseBackup(await file.text());
    if (!data) {
      this.tell("Can't restore", `${file.name} isn't a RowReps backup file.`);
      return;
    }
    const dates = new Set(this.sessions.all()?.map((session) => session.date));
    const added = data.sessions.filter((session) => !dates.has(session.date)).length;
    if (!added) {
      this.tell('Nothing to restore', 'Every day in this file is already on this phone.');
      return;
    }
    this.confirm(data, file.name, added);
  }

  private confirm(data: Backup, file: string, added: number): void {
    this.restoring.set({ file, added, kept: data.sessions.length - added });
    const label =
      data.sessions.length === 1
        ? 'Restore 1 workout?'
        : `Restore ${data.sessions.length} workouts?`;
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label,
        size: 's',
        data: { content: this.restoreText(), yes: 'Restore', no: 'Cancel' },
      })
      .pipe(filter(Boolean))
      .subscribe(() => restore(data));
  }

  private tell(label: string, content: string): void {
    this.dialogs.open(content, { label, size: 's' }).subscribe();
  }

  // Saves the text as a file named after the app, what it holds and today's date.
  private download(name: string, extension: string, type: string, text: string): void {
    const link = this.document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type }));
    link.download = `rowreps-${name}-${TuiDay.currentLocal().toJSON()}.${extension}`;
    link.click();
    URL.revokeObjectURL(link.href);
    this.exporting.set(false);
  }
}
