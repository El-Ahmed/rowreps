import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { EXERCISES } from '../exercises';
import { TodayList } from '../today-list';
import { Today } from './today';

describe('Today', () => {
  const [bench, incline, squat] = EXERCISES;
  let fixture: ComponentFixture<Today>;
  let todayList: TodayList;

  const element = () => fixture.nativeElement as HTMLElement;
  const names = () =>
    [...element().querySelectorAll('li [tuiTitle]')].map((title) => title.textContent?.trim());
  const button = (text: string) =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    todayList = TestBed.inject(TodayList);
    fixture = TestBed.createComponent(Today);
    await render();
  });

  it('shows a prompt and the add button when nothing is planned', () => {
    expect(element().textContent).toContain('What are you lifting today?');
    expect(element().querySelector('a[href="/add"]')?.textContent).toContain('Add exercise');
    expect(button('Edit')).toBeUndefined();
  });

  it("lists today's exercises in order", async () => {
    todayList.add(bench);
    todayList.add(incline);
    await render();

    expect(names()).toEqual([bench.name, incline.name]);
    expect(element().textContent).not.toContain('What are you lifting today?');
  });

  it('deletes an exercise with its swipe action', async () => {
    todayList.add(bench);
    todayList.add(incline);
    await render();

    button(`Delete ${bench.name}`)?.click();
    await render();

    expect(names()).toEqual([incline.name]);
  });

  describe('edit mode', () => {
    beforeEach(async () => {
      todayList.add(bench);
      todayList.add(incline);
      todayList.add(squat);
      await render();
      button('Edit')?.click();
      await render();
    });

    it('swaps Edit for Done and hides the add button', () => {
      expect(button('Done')).toBeDefined();
      expect(element().querySelector('a[href="/add"]')).toBeNull();
    });

    it('removes an exercise', async () => {
      button(`Remove ${incline.name}`)?.click();
      await render();

      expect(names()).toEqual([bench.name, squat.name]);
    });

    it('reorders exercises when one is dropped in a new place', async () => {
      fixture.debugElement
        .query(By.directive(CdkDropList))
        .triggerEventHandler('cdkDropListDropped', { previousIndex: 0, currentIndex: 2 });
      await render();

      expect(names()).toEqual([incline.name, squat.name, bench.name]);
    });

    it('leaves edit mode after the last exercise is removed', async () => {
      for (const exercise of [bench, incline, squat]) {
        button(`Remove ${exercise.name}`)?.click();
        await render();
      }

      expect(button('Done')).toBeUndefined();
      expect(element().textContent).toContain('What are you lifting today?');
    });

    it('returns to the normal list with Done', async () => {
      button('Done')?.click();
      await render();

      expect(button('Edit')).toBeDefined();
      expect(button(`Remove ${bench.name}`)).toBeUndefined();
    });
  });
});
