import React from 'react';
import { BookOpen } from 'lucide-react';
import TeacherComingSoon from './TeacherComingSoon';

const TeacherLessonsPage: React.FC = () => (
  <TeacherComingSoon
    icon={<BookOpen size={26} />}
    title="Lessons"
    note="The lesson list, full plan-document viewer, Teach mode overlay, and Word/PDF export build here, on top of LessonPlanGeneratorModal."
    slice="Next · Slice 3"
  />
);

export default TeacherLessonsPage;
