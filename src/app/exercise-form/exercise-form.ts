import { Component, input, linkedSignal, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiError, TuiIcon, TuiInput, TuiLabel } from '@taiga-ui/core';
import { TuiBlock } from '@taiga-ui/kit';

interface MuscleGroup {
  name: string;
  // free-exercise-db's names for the muscles in the group.
  muscles: string[];
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  { name: 'Chest', muscles: ['chest'] },
  { name: 'Back', muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  {
    name: 'Legs',
    muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  },
  { name: 'Shoulders', muscles: ['shoulders'] },
  { name: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { name: 'Core', muscles: ['abdominals'] },
  { name: 'Neck', muscles: ['neck'] },
];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// An exercise's name, muscle group and main muscles, as created or edited.
@Component({
  selector: 'app-exercise-form',
  imports: [FormsModule, TuiBlock, TuiError, TuiIcon, TuiInput, TuiLabel],
  templateUrl: './exercise-form.html',
  styleUrl: './exercise-form.css',
})
export class ExerciseForm {
  readonly name = model('');
  readonly muscles = model<string[]>([]);
  // Shown under the name, such as when the name is taken.
  readonly nameError = input<string | null>(null);

  protected readonly groups = MUSCLE_GROUPS;
  protected readonly capitalize = capitalize;
  // The group of the first muscle. It stays picked when every muscle is unticked.
  protected readonly group = linkedSignal<string[], MuscleGroup | undefined>({
    source: this.muscles,
    computation: (muscles, previous) =>
      MUSCLE_GROUPS.find((group) => group.muscles.includes(muscles[0])) ?? previous?.value,
  });

  // Picking a group starts with its first muscle worked.
  protected pick(group: MuscleGroup): void {
    this.muscles.set(group.muscles.slice(0, 1));
  }

  protected toggle(muscle: string): void {
    this.muscles.update((muscles) =>
      muscles.includes(muscle) ? muscles.filter((item) => item !== muscle) : [...muscles, muscle],
    );
  }
}
