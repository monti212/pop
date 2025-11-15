/*
  # Add GreyEd Teach Demo Data

  Creates comprehensive demo data for GreyEd Teach system including:
  - 1 demo class (5th Grade Mathematics)
  - 12 students with varied profiles
  - 30 days of attendance records
  - 4 assignments
  - 36 grade records
  - 6 behavior logs
*/

DO $$
DECLARE
  v_demo_teacher_id uuid;
  v_demo_class_id uuid;
  v_student_ids uuid[];
  v_student_id uuid;
  v_assignment_ids uuid[];
  v_assignment_id uuid;
  i integer;
  j integer;
  attendance_date date;
  grade_value decimal;
  rand_val decimal;

BEGIN
  -- Get the first available user to use as demo teacher
  SELECT id INTO v_demo_teacher_id FROM auth.users LIMIT 1;

  IF v_demo_teacher_id IS NULL THEN
    RAISE EXCEPTION 'No users found. Please create a user account first.';
  END IF;

  -- Check if demo class already exists
  SELECT id INTO v_demo_class_id 
  FROM classes 
  WHERE class_name = '5th Grade Mathematics' 
    AND teacher_id = v_demo_teacher_id 
  LIMIT 1;

  IF v_demo_class_id IS NOT NULL THEN
    RAISE NOTICE 'Demo class already exists. Skipping.';
    RETURN;
  END IF;

  -- CREATE DEMO CLASS
  INSERT INTO classes (
    teacher_id, class_name, subject, grade_level, class_section, description,
    meeting_days, meeting_time, room_location, active_status
  ) VALUES (
    v_demo_teacher_id, '5th Grade Mathematics', 'Mathematics', '5th Grade', 'Section A',
    'Advanced mathematics for 5th grade students focusing on fractions, decimals, and basic algebra',
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], '9:00 AM', 'Room 203', true
  ) RETURNING id INTO v_demo_class_id;

  -- CREATE DEMO STUDENTS
  INSERT INTO students (class_id, student_name, student_identifier, has_neurodivergence, neurodivergence_type, accommodations, learning_notes, active_status)
  VALUES 
    (v_demo_class_id, 'Emma Thompson', 'ST-2024-001', false, NULL, NULL, 'Excellent problem-solving skills, loves word problems', true),
    (v_demo_class_id, 'Marcus Johnson', 'ST-2024-002', true, 'ADHD', 'Extended time on tests, preferential seating', 'Highly creative, benefits from movement breaks', true),
    (v_demo_class_id, 'Sofia Rodriguez', 'ST-2024-003', false, NULL, NULL, 'Strong visual learner, excels with diagrams', true),
    (v_demo_class_id, 'Liam Chen', 'ST-2024-004', true, 'Dyslexia', 'Audio versions of materials, extra time', 'Gifted in mental math', true),
    (v_demo_class_id, 'Olivia Patel', 'ST-2024-005', false, NULL, NULL, 'Quick learner, enjoys challenging problems', true),
    (v_demo_class_id, 'Noah Williams', 'ST-2024-006', false, NULL, NULL, 'Consistent effort, needs confidence building', true),
    (v_demo_class_id, 'Ava Martinez', 'ST-2024-007', false, NULL, NULL, 'Excellent at explaining concepts to peers', true),
    (v_demo_class_id, 'Ethan Brown', 'ST-2024-008', true, 'Autism', 'Structured routine, clear instructions', 'Exceptional with patterns', true),
    (v_demo_class_id, 'Isabella Garcia', 'ST-2024-009', false, NULL, NULL, 'Strong work ethic, completes all homework', true),
    (v_demo_class_id, 'Mason Taylor', 'ST-2024-010', false, NULL, NULL, 'Needs support with multi-step problems', true),
    (v_demo_class_id, 'Mia Anderson', 'ST-2024-011', false, NULL, NULL, 'Participates actively, asks great questions', true),
    (v_demo_class_id, 'Lucas Thompson', 'ST-2024-012', true, 'Dyscalculia', 'Calculator use permitted', 'Shows perseverance', true);

  SELECT array_agg(id ORDER BY student_name) INTO v_student_ids FROM students WHERE class_id = v_demo_class_id;

  -- CREATE ATTENDANCE RECORDS (Last 30 days, weekdays only)
  FOR i IN 0..29 LOOP
    attendance_date := CURRENT_DATE - i;

    IF EXTRACT(DOW FROM attendance_date) BETWEEN 1 AND 5 THEN
      FOR j IN 1..array_length(v_student_ids, 1) LOOP
        v_student_id := v_student_ids[j];
        rand_val := random();

        INSERT INTO attendance_records (
          student_id, class_id, attendance_date, status, recorded_by
        ) VALUES (
          v_student_id, v_demo_class_id, attendance_date,
          CASE 
            WHEN rand_val < 0.85 THEN 'present'
            WHEN rand_val < 0.90 THEN 'late'
            ELSE 'absent'
          END,
          v_demo_teacher_id
        );
      END LOOP;
    END IF;
  END LOOP;

  -- CREATE ASSIGNMENTS
  INSERT INTO assignments (class_id, title, description, points_possible, due_date, assigned_date, assignment_type, status)
  VALUES
    (v_demo_class_id, 'Fraction Operations Quiz', 'Assessment covering operations with fractions', 25.00, CURRENT_DATE - 15, CURRENT_DATE - 20, 'quiz', 'active'),
    (v_demo_class_id, 'Decimal Place Value Project', 'Visual presentation on decimal place value', 50.00, CURRENT_DATE - 8, CURRENT_DATE - 15, 'project', 'active'),
    (v_demo_class_id, 'Word Problems Homework Set 1', 'Real-world math problems with fractions and decimals', 20.00, CURRENT_DATE - 3, CURRENT_DATE - 7, 'homework', 'active'),
    (v_demo_class_id, 'Mid-Unit Assessment', 'Comprehensive unit test', 100.00, CURRENT_DATE + 5, CURRENT_DATE - 2, 'test', 'active');

  SELECT array_agg(id ORDER BY due_date) INTO v_assignment_ids FROM assignments WHERE class_id = v_demo_class_id;

  -- CREATE STUDENT GRADES (First 3 assignments only)
  FOR j IN 1..array_length(v_student_ids, 1) LOOP
    v_student_id := v_student_ids[j];

    grade_value := 15 + (random() * 10)::decimal;
    INSERT INTO student_grades (student_id, assignment_id, class_id, grade_value, points_possible, graded_date)
    VALUES (v_student_id, v_assignment_ids[1], v_demo_class_id, ROUND(grade_value, 2), 25.00, CURRENT_DATE - 14);

    grade_value := 30 + (random() * 20)::decimal;
    INSERT INTO student_grades (student_id, assignment_id, class_id, grade_value, points_possible, graded_date)
    VALUES (v_student_id, v_assignment_ids[2], v_demo_class_id, ROUND(grade_value, 2), 50.00, CURRENT_DATE - 7);

    grade_value := 12 + (random() * 8)::decimal;
    INSERT INTO student_grades (student_id, assignment_id, class_id, grade_value, points_possible, graded_date)
    VALUES (v_student_id, v_assignment_ids[3], v_demo_class_id, ROUND(grade_value, 2), 20.00, CURRENT_DATE - 2);
  END LOOP;

  -- CREATE BEHAVIOR LOGS
  INSERT INTO student_behavior_logs (student_id, class_id, incident_date, behavior_type, severity, description, context, recorded_by)
  VALUES
    (v_student_ids[1], v_demo_class_id, CURRENT_DATE - 5, 'Positive Recognition', 'minor', 'Excellent participation and helped classmates', 'Group work activity', v_demo_teacher_id),
    (v_student_ids[7], v_demo_class_id, CURRENT_DATE - 8, 'Positive Recognition', 'minor', 'Outstanding project presentation', 'Project presentations', v_demo_teacher_id),
    (v_student_ids[2], v_demo_class_id, CURRENT_DATE - 10, 'Off-task Behavior', 'minor', 'Needed redirection during independent work', 'Successfully refocused after break', v_demo_teacher_id),
    (v_student_ids[8], v_demo_class_id, CURRENT_DATE - 3, 'Positive Recognition', 'minor', 'Exceptional work identifying patterns', 'Pattern recognition activity', v_demo_teacher_id),
    (v_student_ids[11], v_demo_class_id, CURRENT_DATE - 6, 'Positive Recognition', 'minor', 'Asked insightful questions', 'Word problem solving lesson', v_demo_teacher_id),
    (v_student_ids[12], v_demo_class_id, CURRENT_DATE - 4, 'Positive Recognition', 'minor', 'Demonstrated great perseverance', 'Individual work time', v_demo_teacher_id);

  RAISE NOTICE 'Demo data created: Class with 12 students, 4 assignments, 36 grades, 6 behavior logs';

END $$;
