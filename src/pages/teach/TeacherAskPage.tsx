import React from 'react';
import { MessageCircle } from 'lucide-react';
import TeacherComingSoon from './TeacherComingSoon';

const TeacherAskPage: React.FC = () => (
  <TeacherComingSoon
    icon={<MessageCircle size={26} />}
    title="Ask GreyEd"
    note="The Ask / Do assistant — read-only Ask, agentic Do with the 'GreyEd can see' context chips and propose → approve → execute flow — builds here over the Chat components."
    slice="Next · Slice 4"
  />
);

export default TeacherAskPage;
