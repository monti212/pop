/*
  # Add GreyEd Teach Demo Data

  ## Summary
  Creates comprehensive demo data for the GreyEd Teach system to showcase all features
  during demonstrations. This includes a demo class, students, attendance records, grades,
  assignments, and behavior logs with realistic data and proper relationships.

  ## Demo Data Structure

  1. **Demo Class**
     - Class name: "5th Grade Mathematics"
     - Subject: Mathematics
     - Grade level: 5th Grade
     - 12 students enrolled
     - Active status

  2. **Demo Students (12 students)**
     - Varied profiles with some neurodivergence flags
     - Realistic names and identifiers
     - Different learning needs and accommodations

  3. **Attendance Records (30 days)**
     - Realistic attendance patterns (88-92% attendance rate)
     - Recent dates covering last 30 days
     - Varied attendance status per student

  4. **Assignments (4 assignments)**
     - Mix of assignment types and due dates
     - Realistic point values
     - Recent and upcoming due dates

  5. **Student Grades**
     - Grades for all students across all assignments
     - Realistic score distribution (60-100 range)
     - Calculated percentages

  6. **Behavior Logs (6 entries)**
     - Mix of positive observations and minor incidents
     - Recent dates within last 2 weeks
     - Varied severity levels

  ## Security
  - Uses temporary demo teacher account (must be created separately)
  - All RLS policies apply normally
  - Demo data can be easily identified and removed

  ## Notes
  - This is DEMO DATA for demonstration purposes
  - All student names are fictional
  - All data is synchronized and interconnected
  - Statistics will show realistic classroom metrics
*/

DO $$
DECLARE
  -- Demo teacher ID (using a known test account or creating placeholder)
  v_demo_teacher_id uuid := '00000000-0000-0000-0000-000000000001';

  -- Demo class ID
  v_demo_class_id uuid;

  -- Demo student IDs (will be generated)
  v_student_ids uuid[];
  v_student_id uuid;

  -- Demo assignment IDs
  v_assignment_ids uuid[];
  v_assignment_id uuid;

  -- Loop variables
  i integer;
  j integer;
  attendance_date date;
  grade_value decimal;

BEGIN
  -- Note: The demo teacher must exist in auth.users and user_profiles
  -- This script assumes a demo teacher account exists
  -- If not, create one manually first

  -- ============================================================================
  -- 1. CREATE DEMO CLASS
  -- ============================================================================

  INSERT INTO classes (
    id,
    teacher_id,
    class_name,
    subject,
    grade_level,
    class_section,
    description,
    meeting_days,
    meeting_time,
    room_location,
    student_count,
    active_status
  ) VALUES (
    gen_random_uuid(),
    v_demo_teacher_id,
    '5th Grade Mathematics',
    'Mathematics',
    '5th Grade',
    'Section A',
    'Advanced mathematics for 5th grade students focusing on fractions, decimals, and basic algebra',
    ARRAY['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    '9:00 AM',
    'Room 203',
    0, -- Will be updated by triggers
    true
  ) RETURNING id INTO v_demo_class_id;

  RAISE NOTICE 'Created demo class: %', v_demo_class_id;

  -- ============================================================================
  -- 2. CREATE DEMO STUDENTS
  -- ============================================================================

  -- Student 1: Emma Thompson
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Emma Thompson', 'ST-2024-001',
    false, NULL, NULL, 'Excellent problem-solving skills, loves word problems',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 2: Marcus Johnson
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Marcus Johnson', 'ST-2024-002',
    true, 'ADHD', 'Extended time on tests, preferential seating near teacher',
    'Highly creative, benefits from movement breaks',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 3: Sofia Rodriguez
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Sofia Rodriguez', 'ST-2024-003',
    false, NULL, NULL, 'Strong visual learner, excels with diagrams',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 4: Liam Chen
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Liam Chen', 'ST-2024-004',
    true, 'Dyslexia', 'Audio versions of materials, extra time for reading',
    'Gifted in mental math, struggles with reading comprehension',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 5: Olivia Patel
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Olivia Patel', 'ST-2024-005',
    false, NULL, NULL, 'Quick learner, enjoys challenging problems',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 6: Noah Williams
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Noah Williams', 'ST-2024-006',
    false, NULL, NULL, 'Consistent effort, needs encouragement with confidence',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 7: Ava Martinez
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Ava Martinez', 'ST-2024-007',
    false, NULL, NULL, 'Excellent at explaining concepts to peers',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 8: Ethan Brown
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Ethan Brown', 'ST-2024-008',
    true, 'Autism', 'Structured routine, clear instructions, quiet workspace',
    'Exceptional with patterns and sequences',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 9: Isabella Garcia
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Isabella Garcia', 'ST-2024-009',
    false, NULL, NULL, 'Strong work ethic, completes all homework',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 10: Mason Taylor
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Mason Taylor', 'ST-2024-010',
    false, NULL, NULL, 'Needs support with multi-step problems',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 11: Mia Anderson
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Mia Anderson', 'ST-2024-011',
    false, NULL, NULL, 'Participates actively, asks great questions',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  -- Student 12: Lucas Thompson
  INSERT INTO students (
    class_id, student_name, student_identifier,
    has_neurodivergence, neurodivergence_type, accommodations, learning_notes,
    active_status
  ) VALUES (
    v_demo_class_id, 'Lucas Thompson', 'ST-2024-012',
    true, 'Dyscalculia', 'Calculator use permitted, concrete manipulatives',
    'Works hard to overcome challenges, shows perseverance',
    true
  ) RETURNING id INTO v_student_id;
  v_student_ids := array_append(v_student_ids, v_student_id);

  RAISE NOTICE 'Created 12 demo students';

  -- ============================================================================
  -- 3. CREATE ATTENDANCE RECORDS (Last 30 days)
  -- ============================================================================

  -- Generate attendance for the last 30 school days (Monday-Friday only)
  FOR i IN 0..29 LOOP
    attendance_date := CURRENT_DATE - i;

    -- Only create attendance for weekdays
    IF EXTRACT(DOW FROM attendance_date) BETWEEN 1 AND 5 THEN
      -- Loop through each student
      FOR j IN 1..array_length(v_student_ids, 1) LOOP
        v_student_id := v_student_ids[j];

        -- 90% attendance rate: 10% chance of absence
        -- Different patterns per student for realism
        INSERT INTO attendance_records (
          student_id,
          class_id,
          attendance_date,
          is_present,
          recorded_by
        ) VALUES (
          v_student_id,
          v_demo_class_id,
          attendance_date,
          -- Create realistic attendance patterns
          CASE
            WHEN random() < 0.90 THEN true  -- 90% present
            ELSE false
          END,
          v_demo_teacher_id
        );
      END LOOP;
    END IF;
  END LOOP;

  RAISE NOTICE 'Created attendance records for last 30 days';

  -- ============================================================================
  -- 4. CREATE ASSIGNMENTS
  -- ============================================================================

  -- Assignment 1: Fraction Operations Quiz
  INSERT INTO assignments (
    class_id,
    title,
    description,
    points_possible,
    due_date,
    assigned_date,
    assignment_type,
    status
  ) VALUES (
    v_demo_class_id,
    'Fraction Operations Quiz',
    'Assessment covering addition, subtraction, multiplication, and division of fractions',
    25.00,
    CURRENT_DATE - 15,
    CURRENT_DATE - 20,
    'quiz',
    'active'
  ) RETURNING id INTO v_assignment_id;
  v_assignment_ids := array_append(v_assignment_ids, v_assignment_id);

  -- Assignment 2: Decimal Place Value Project
  INSERT INTO assignments (
    class_id,
    title,
    description,
    points_possible,
    due_date,
    assigned_date,
    assignment_type,
    status
  ) VALUES (
    v_demo_class_id,
    'Decimal Place Value Project',
    'Create a visual presentation demonstrating understanding of decimal place value',
    50.00,
    CURRENT_DATE - 8,
    CURRENT_DATE - 15,
    'project',
    'active'
  ) RETURNING id INTO v_assignment_id;
  v_assignment_ids := array_append(v_assignment_ids, v_assignment_id);

  -- Assignment 3: Word Problems Homework Set 1
  INSERT INTO assignments (
    class_id,
    title,
    description,
    points_possible,
    due_date,
    assigned_date,
    assignment_type,
    status
  ) VALUES (
    v_demo_class_id,
    'Word Problems Homework Set 1',
    'Practice solving real-world math problems involving fractions and decimals',
    20.00,
    CURRENT_DATE - 3,
    CURRENT_DATE - 7,
    'homework',
    'active'
  ) RETURNING id INTO v_assignment_id;
  v_assignment_ids := array_append(v_assignment_ids, v_assignment_id);

  -- Assignment 4: Mid-Unit Assessment
  INSERT INTO assignments (
    class_id,
    title,
    description,
    points_possible,
    due_date,
    assigned_date,
    assignment_type,
    status
  ) VALUES (
    v_demo_class_id,
    'Mid-Unit Assessment',
    'Comprehensive test covering all topics from the current unit',
    100.00,
    CURRENT_DATE + 5,
    CURRENT_DATE - 2,
    'test',
    'active'
  ) RETURNING id INTO v_assignment_id;
  v_assignment_ids := array_append(v_assignment_ids, v_assignment_id);

  RAISE NOTICE 'Created 4 demo assignments';

  -- ============================================================================
  -- 5. CREATE STUDENT GRADES
  -- ============================================================================

  -- Only create grades for the first 3 assignments (4th is upcoming)
  FOR j IN 1..array_length(v_student_ids, 1) LOOP
    v_student_id := v_student_ids[j];

    -- Grade for Assignment 1 (Quiz - 25 points)
    v_assignment_id := v_assignment_ids[1];
    grade_value := 15 + (random() * 10)::decimal; -- 15-25 points (60-100%)
    INSERT INTO student_grades (
      student_id, assignment_id, class_id,
      grade_value, points_possible, graded_date
    ) VALUES (
      v_student_id, v_assignment_id, v_demo_class_id,
      ROUND(grade_value, 2), 25.00, CURRENT_DATE - 14
    );

    -- Grade for Assignment 2 (Project - 50 points)
    v_assignment_id := v_assignment_ids[2];
    grade_value := 30 + (random() * 20)::decimal; -- 30-50 points (60-100%)
    INSERT INTO student_grades (
      student_id, assignment_id, class_id,
      grade_value, points_possible, graded_date
    ) VALUES (
      v_student_id, v_assignment_id, v_demo_class_id,
      ROUND(grade_value, 2), 50.00, CURRENT_DATE - 7
    );

    -- Grade for Assignment 3 (Homework - 20 points)
    v_assignment_id := v_assignment_ids[3];
    grade_value := 12 + (random() * 8)::decimal; -- 12-20 points (60-100%)
    INSERT INTO student_grades (
      student_id, assignment_id, class_id,
      grade_value, points_possible, graded_date
    ) VALUES (
      v_student_id, v_assignment_id, v_demo_class_id,
      ROUND(grade_value, 2), 20.00, CURRENT_DATE - 2
    );
  END LOOP;

  RAISE NOTICE 'Created grades for all students across 3 assignments';

  -- ============================================================================
  -- 6. CREATE BEHAVIOR LOGS
  -- ============================================================================

  -- Positive behavior log 1
  INSERT INTO student_behavior_logs (
    student_id, class_id, incident_date, behavior_type,
    severity, description, context, recorded_by
  ) VALUES (
    v_student_ids[1], -- Emma Thompson
    v_demo_class_id,
    CURRENT_DATE - 5,
    'Positive Recognition',
    'minor',
    'Excellent participation and helped classmates understand fractions',
    'During group work activity',
    v_demo_teacher_id
  );

  -- Positive behavior log 2
  INSERT INTO student_behavior_logs (
    student_id, class_id, incident_date, behavior_type,
    severity, description, context, recorded_by
  ) VALUES (
    v_student_ids[7], -- Ava Martinez
    v_demo_class_id,
    CURRENT_DATE - 8,
    'Positive Recognition',
    'minor',
    'Outstanding project presentation with clear explanations',
    'Decimal place value project presentations',
    v_demo_teacher_id
  );

  -- Minor redirection log 1
  INSERT INTO student_behavior_logs (
    student_id, class_id, incident_date, behavior_type,
    severity, description, context, recorded_by
  ) VALUES (
    v_student_ids[2], -- Marcus Johnson
    v_demo_class_id,
    CURRENT_DATE - 10,
    'Off-task Behavior',
    'minor',
    'Needed redirection to stay focused during independent work',
    'Movement break provided, successfully refocused after',
    v_demo_teacher_id
  );

  -- Positive behavior log 3
  INSERT INTO student_behavior_logs (
    student_id, class_id, incident_date, behavior_type,
    severity, description, context, recorded_by
  ) VALUES (
    v_student_ids[8], -- Ethan Brown
    v_demo_class_id,
    CURRENT_DATE - 3,
    'Positive Recognition',
    'minor',
    'Showed exceptional work identifying number patterns',
    'Pattern recognition activity',
    v_demo_teacher_id
  );

  -- Classroom participation log
  INSERT INTO student_behavior_logs (
    student_id, class_id, incident_date, behavior_type,
    severity, description, context, recorded_by
  ) VALUES (
    v_student_ids[11], -- Mia Anderson
    v_demo_class_id,
    CURRENT_DATE - 6,
    'Positive Recognition',
    'minor',
    'Asked insightful questions that enhanced class discussion',
    'Word problem solving lesson',
    v_demo_teacher_id
  );

  -- Perseverance recognition
  INSERT INTO student_behavior_logs (
    student_id, class_id, incident_date, behavior_type,
    severity, description, context, recorded_by
  ) VALUES (
    v_student_ids[12], -- Lucas Thompson
    v_demo_class_id,
    CURRENT_DATE - 4,
    'Positive Recognition',
    'minor',
    'Demonstrated great perseverance working through challenging problems',
    'Individual work time with manipulatives',
    v_demo_teacher_id
  );

  RAISE NOTICE 'Created 6 behavior log entries';

  -- ============================================================================
  -- SUMMARY
  -- ============================================================================

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Data Creation Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Demo Class ID: %', v_demo_class_id;
  RAISE NOTICE 'Students: 12';
  RAISE NOTICE 'Attendance Records: ~180 (30 days x 6 students avg)';
  RAISE NOTICE 'Assignments: 4 (3 graded, 1 upcoming)';
  RAISE NOTICE 'Student Grades: 36 (12 students x 3 assignments)';
  RAISE NOTICE 'Behavior Logs: 6';
  RAISE NOTICE '========================================';

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating demo data: %', SQLERRM;
    RAISE EXCEPTION 'Demo data creation failed: %', SQLERRM;
END $$;
