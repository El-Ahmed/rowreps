import { TestBed } from '@angular/core/testing';
import { Exercise } from './exercises';
import { TodayList } from './today-list';

describe('TodayList', () => {
  const bench: Exercise = {
    id: 'Barbell_Bench_Press_-_Medium_Grip',
    name: 'Barbell Bench Press - Medium Grip',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
  };
  const pullups: Exercise = {
    id: 'Pullups',
    name: 'Pullups',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'middle back'],
  };
  const squat: Exercise = {
    id: 'Barbell_Squat',
    name: 'Barbell Squat',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'lower back'],
  };
  let todayList: TodayList;

  beforeEach(() => {
    todayList = TestBed.inject(TodayList);
  });

  it('starts empty', () => {
    expect(todayList.exercises()).toEqual([]);
  });

  it('adds exercises in the order they were picked', () => {
    todayList.add(bench);
    todayList.add(pullups);

    expect(todayList.exercises()).toEqual([bench, pullups]);
  });

  it('does not add the same exercise twice', () => {
    todayList.add(bench);
    todayList.add(bench);

    expect(todayList.exercises()).toEqual([bench]);
  });

  it('removes an exercise', () => {
    todayList.add(bench);
    todayList.add(pullups);
    todayList.remove(bench);

    expect(todayList.exercises()).toEqual([pullups]);
    expect(todayList.has(bench)).toBe(false);
  });

  it('moves an exercise to a new position', () => {
    todayList.add(bench);
    todayList.add(pullups);
    todayList.add(squat);
    todayList.move(0, 2);

    expect(todayList.exercises()).toEqual([pullups, squat, bench]);
  });
});
