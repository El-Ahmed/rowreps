import {
  Component,
  ElementRef,
  TemplateRef,
  inject,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nPluralPipe } from '@angular/common';
import { TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { filter } from 'rxjs';
import { Backup, parseBackup, restore } from '../backup';
import { Sessions } from '../sessions';

// Restores workouts from a backup file: picks the file, then asks before adding its days.
@Component({
  selector: 'app-restore',
  imports: [I18nPluralPipe],
  templateUrl: './restore.html',
  styleUrl: './restore.css',
})
export class Restore {
  private readonly sessions = inject(Sessions);
  private readonly dialogs = inject(TuiDialogService);
  private readonly input = viewChild.required<ElementRef<HTMLInputElement>>('file');
  private readonly text = viewChild.required<TemplateRef<unknown>>('text');

  // How many days were added.
  readonly restored = output<number>();

  protected readonly kept = {
    '=1': '1 day you already have on this phone stays as it is.',
    other: '# days you already have on this phone stay as they are.',
  };
  protected readonly newDays = { '=1': '1 new day', other: '# new days' };

  // What the restore alert says about the picked file.
  protected readonly restoring = signal({ file: '', added: 0, kept: 0 });

  // Opens the phone's file picker.
  open(): void {
    this.input().nativeElement.click();
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
        data: { content: this.text(), yes: 'Restore', no: 'Cancel' },
      })
      .pipe(filter(Boolean))
      .subscribe(async () => {
        await restore(data);
        this.restored.emit(added);
      });
  }

  private tell(label: string, content: string): void {
    this.dialogs.open(content, { label, size: 's' }).subscribe();
  }
}
