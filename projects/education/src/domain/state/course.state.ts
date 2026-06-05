import { Injectable, signal, computed } from '@angular/core';
import { ICourse } from '../model/course.model';

interface ICourseStateData {
  courses: ICourse[];
  selectedCourse: ICourse | null;
}

const INITIAL: ICourseStateData = {
  courses: [],
  selectedCourse: null
};

@Injectable({ providedIn: 'root' })
export class CourseState {
  private readonly _state = signal<ICourseStateData>(INITIAL);

  readonly courses = computed(() => this._state().courses);
  readonly selectedCourse = computed(() => this._state().selectedCourse);

  setCourses(courses: ICourse[]): void {
    this._state.update(s => ({ ...s, courses }));
  }

  setSelectedCourse(course: ICourse | null): void {
    this._state.update(s => ({ ...s, selectedCourse: course }));
  }

  updateCourse(course: ICourse): void {
    this._state.update(s => ({
      ...s,
      courses: s.courses.map(c => (c.id === course.id ? course : c)),
      selectedCourse: s.selectedCourse?.id === course.id ? course : s.selectedCourse
    }));
  }

  removeCourse(id: string): void {
    this._state.update(s => ({
      ...s,
      courses: s.courses.filter(c => c.id !== id),
      selectedCourse: s.selectedCourse?.id === id ? null : s.selectedCourse
    }));
  }
}
