import React from 'react';
import { Users } from 'lucide-react';
import TeacherComingSoon from './TeacherComingSoon';

const TeacherClassesPage: React.FC = () => (
  <TeacherComingSoon
    icon={<Users size={26} />}
    title="Classes"
    note="Your class grid and the detail panel — Roster, the editable Grades table, and Reports — build here, reusing AttendanceModal, AddStudentModal and AddClassModal."
    slice="Next · Slice 2"
  />
);

export default TeacherClassesPage;
