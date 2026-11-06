import { Component, computed, inject, model } from '@angular/core';
import { TuiButton, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { TuiSheetDialog } from '@taiga-ui/addon-mobile';
import { backupFile, download } from '../backup';
import { Sessions } from '../sessions';

// How to add the app to an iPhone's Home Screen. Once something is logged, it first saves the
// workouts to a file, because the Home Screen app starts empty.
@Component({
  selector: 'app-install-sheet',
  imports: [TuiAvatar, TuiButton, TuiSheetDialog, TuiTitle],
  templateUrl: './install-sheet.html',
  styleUrl: './install-sheet.css',
})
export class InstallSheet {
  private readonly sessions = inject(Sessions);

  readonly open = model(false);

  protected readonly logged = computed(() =>
    this.sessions.all()?.some((session) => session.exercises.some((lift) => lift.sets.length)),
  );

  protected readonly steps = [
    { title: 'Tap Share', hint: "In Safari's toolbar", icon: '@tui.share' },
    {
      title: 'Tap Add to Home Screen',
      hint: "Scroll down the list if you don't see it",
      icon: '@tui.square-plus',
    },
    {
      title: 'Open RowReps',
      hint: 'From its new icon on your Home Screen',
      icon: '@tui.smartphone',
    },
  ];

  protected readonly moveSteps = [
    { title: 'Add to Home Screen', hint: 'Tap Share, then Add to Home Screen', icon: '@tui.share' },
    {
      title: 'Open it and tap Restore',
      hint: 'Pick the file you just saved',
      icon: '@tui.smartphone',
    },
  ];

  // Shares the backup so it can go to Files. Without file sharing, downloads it.
  protected async save(): Promise<void> {
    const file = await backupFile();
    if (!navigator.canShare?.({ files: [file] })) {
      download(file);
      return;
    }
    try {
      await navigator.share({ files: [file] });
    } catch {
      // Closing the share sheet without picking anything lands here.
    }
  }
}
