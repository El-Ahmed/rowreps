import { TestBed } from '@angular/core/testing';
import { EXERCISES } from './exercises';
import { TodayList } from './today-list';

describe('TodayList', () => {
  const [bench, incline, squat] = EXERCISES;
  let todayList: TodayList;

  beforeEach(() => {
    todayList = TestBed.inject(TodayList);
  });

  it('starts empty', () => {
    expect(todayList.exercises()).toEqual([]);
  });

  it('adds exercises in the order they were picked', () => {
    todayList.add(bench);
    todayList.add(incline);

    expect(todayList.exercises()).toEqual([bench, incline]);
  });

  it('does not add the same exercise twice', () => {
    todayList.add(bench);
    todayList.add(bench);

    expect(todayList.exercises()).toEqual([bench]);
  });

  it('removes an exercise', () => {
    todayList.add(bench);
    todayList.add(incline);
    todayList.remove(bench);

    expect(todayList.exercises()).toEqual([incline]);
    expect(todayList.has(bench)).toBe(false);
  });

  it('moves an exercise to a new position', () => {
    todayList.add(bench);
    todayList.add(incline);
    todayList.add(squat);
    todayList.move(0, 2);

    expect(todayList.exercises()).toEqual([incline, squat, bench]);
  });
});
