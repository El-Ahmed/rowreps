import { Component, LOCALE_ID, computed, inject } from '@angular/core';
import { DatePipe, I18nPluralPipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiCell, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { Session } from '../db';
import { Sessions } from '../sessions';

@Component({
  selector: 'app-history',
  imports: [DatePipe, I18nPluralPipe, RouterLink, TuiButton, TuiCell, TuiIcon, TuiTitle],
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class SessionHistory {
  private readonly sessions = inject(Sessions);
  private readonly locale = inject(LOCALE_ID);

  protected readonly loaded = computed(() => this.sessions.all() !== undefined);

  // Sessions under "This week", "Last week", then one heading per month. Weeks start on Monday.
  protected readonly groups = computed(() => {
    const today = TuiDay.currentLocal();
    const monday = today.append({ day: -today.dayOfWeek() });
    const groupName = (session: Session): string => {
      const day = TuiDay.jsonParse(session.date);
      if (day.daySameOrAfter(monday)) {
        return 'This week';
      }
      if (day.daySameOrAfter(monday.append({ day: -7 }))) {
        return 'Last week';
      }
      return formatDate(session.date, 'MMMM y', this.locale);
    };
    const sessions = this.sessions.all() ?? [];
    const names = [...new Set(sessions.map(groupName))];

    return names.map((name) => ({
      name,
      sessions: sessions.filter((session) => groupName(session) === name),
    }));
  });

  protected readonly lifts = { '=1': '1 lift', other: '# lifts' };

  protected names(session: Session): string {
    return session.exercises.map((exercise) => exercise.name).join(', ');
  }
}
