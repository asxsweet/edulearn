import bcrypt from 'bcryptjs';
import { qone } from './pg-query.js';
import { stmt } from './stmt.js';

export async function runSeed(pool) {
  const n = Number((await qone(pool, 'SELECT CAST(COUNT(*) AS INTEGER) AS c FROM users')).c);
  if (n > 0) return;

  const hash = (p) => bcrypt.hashSync(p, 10);
  const insUser = stmt(pool,
    `INSERT INTO users (email, password_hash, name, role, student_code, grade_label) VALUES (?,?,?,?,?,?)`
  );

  await insUser.run('admin@edtech.com', hash('admin123'), 'Admin User', 'admin', null, null);

  const aliceId = (
    await insUser.run(
      'alice@example.com',
      hash('student123'),
      'Alice Johnson',
      'student',
      'ST2026001',
      'Grade 10'
    )
  ).lastInsertRowid;

  await insUser.run('bob@example.com', hash('student123'), 'Bob Smith', 'student', 'ST2026002', 'Grade 11');
  await insUser.run('carol@example.com', hash('student123'), 'Carol White', 'student', 'ST2026003', 'Grade 10');
  await insUser.run('david@example.com', hash('student123'), 'David Brown', 'student', 'ST2026004', 'Grade 9');

  const coursesData = [
    {
      title: 'Introduction to Artificial Intelligence',
      desc: 'Learn the fundamentals of AI and its applications in modern technology.',
      emoji: '🤖',
      weeks: 6,
      progress: 75,
    },
    {
      title: 'Machine Learning Basics',
      desc: 'Understand the core concepts of machine learning and build your first models.',
      emoji: '🧠',
      weeks: 8,
      progress: 45,
    },
    {
      title: 'Neural Networks Deep Dive',
      desc: 'Explore the architecture and training of neural networks.',
      emoji: '🔗',
      weeks: 10,
      progress: 20,
    },
    {
      title: 'Natural Language Processing',
      desc: 'Learn how computers understand and process human language.',
      emoji: '💬',
      weeks: 7,
      progress: 0,
    },
    {
      title: 'Computer Vision',
      desc: 'Discover how AI can see and interpret visual information.',
      emoji: '👁️',
      weeks: 9,
      progress: 0,
    },
    {
      title: 'AI Ethics and Society',
      desc: 'Understand the ethical implications and societal impact of AI.',
      emoji: '⚖️',
      weeks: 5,
      progress: 0,
    },
  ];

  const insCourse = stmt(pool,
    `INSERT INTO courses (title, description, image_emoji, duration_weeks, status, deadline_date) VALUES (?,?,?,?,?,?)`
  );

  const courseIds = [];
  for (let i = 0; i < coursesData.length; i++) {
    const c = coursesData[i];
    const deadline = `2026-${String(5 + i).padStart(2, '0')}-15`;
    const status = i < 3 ? 'active' : i === 3 ? 'draft' : 'active';
    const id = (await insCourse.run(c.title, c.desc, c.emoji, c.weeks, status, deadline)).lastInsertRowid;
    courseIds.push({ id, ...c, enrolled: i < 3 });
  }

  const detailDesc =
    'This comprehensive course introduces you to the fundamental concepts of Artificial Intelligence. You will learn about the history of AI, different types of AI systems, and explore real-world applications. By the end of this course, you will have a solid foundation to continue your AI learning journey.';
  await stmt(pool, `UPDATE courses SET description = ? WHERE id = ?`).run(detailDesc, courseIds[0].id);

  const insLesson = stmt(pool,
    `INSERT INTO lessons (course_id, title, duration_label, sort_order, key_points_json) VALUES (?,?,?,?,?)`
  );
  const kp = JSON.stringify([
    'Understand the fundamental concepts of Artificial Intelligence',
    'Learn about different types of AI systems and their applications',
    'Explore real-world examples of AI in action',
  ]);
  const lessonsC1 = [
    ['What is Artificial Intelligence?', '15 min', 1],
    ['History of AI', '20 min', 2],
    ['Types of AI Systems', '25 min', 3],
    ['Machine Learning Basics', '30 min', 4],
    ['Deep Learning Introduction', '35 min', 5],
    ['AI Applications in Real World', '25 min', 6],
  ];
  for (const [title, dur, order] of lessonsC1) {
    await insLesson.run(courseIds[0].id, title, dur, order, kp);
  }

  const insMat = stmt(pool,
    `INSERT INTO materials (course_id, name, size_label, type_label) VALUES (?,?,?,?)`
  );
  await insMat.run(courseIds[0].id, 'Course Syllabus.pdf', '2.4 MB', 'PDF');
  await insMat.run(courseIds[0].id, 'AI Fundamentals Slides.pptx', '8.1 MB', 'PPTX');
  await insMat.run(courseIds[0].id, 'Reading Materials.pdf', '5.3 MB', 'PDF');

  const insLink = stmt(pool, `INSERT INTO external_links (course_id, name, url) VALUES (?,?,?)`);
  await insLink.run(courseIds[0].id, 'AI Research Papers', 'https://arxiv.org/list/cs.AI/recent');
  await insLink.run(courseIds[0].id, 'Google AI Blog', 'https://ai.googleblog.com/');
  await insLink.run(courseIds[0].id, 'OpenAI Documentation', 'https://platform.openai.com/docs');

  const insTest = stmt(pool,
    `INSERT INTO tests (course_id, title, question_count, time_limit_seconds) VALUES (?,?,?,?)`
  );
  const t1 = (await insTest.run(courseIds[0].id, 'Module 1 Quiz', 5, 1800)).lastInsertRowid;
  await insTest.run(courseIds[0].id, 'Mid-term Assessment', 25, 3600);
  await insTest.run(courseIds[0].id, 'Final Exam', 50, 5400);

  const questions = [
    [
      'What does AI stand for?',
      ['Artificial Intelligence', 'Automated Information', 'Advanced Integration', 'Application Interface'],
      0,
    ],
    [
      'Which of the following is a type of machine learning?',
      ['Supervised Learning', 'Unsupervised Learning', 'Reinforcement Learning', 'All of the above'],
      3,
    ],
    [
      'What is the primary goal of AI?',
      ['To replace humans', 'To simulate human intelligence', 'To make computers faster', 'To create video games'],
      1,
    ],
    [
      'Which algorithm is commonly used for classification tasks?',
      ['Linear Regression', 'K-Means', 'Decision Trees', 'PCA'],
      2,
    ],
    [
      'What is a neural network inspired by?',
      ['Computer circuits', 'Human brain', 'Mathematical equations', 'Cloud computing'],
      1,
    ],
  ];
  const insQ = stmt(pool,
    `INSERT INTO test_questions (test_id, sort_order, question_text, options_json, correct_index) VALUES (?,?,?,?,?)`
  );
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    await insQ.run(t1, i + 1, q[0], JSON.stringify(q[1]), q[2]);
  }

  const insAsg = stmt(pool, `INSERT INTO assignments (course_id, title, due_date) VALUES (?,?,?)`);
  await insAsg.run(courseIds[0].id, 'AI Ethics Essay', '2026-04-15');
  await insAsg.run(courseIds[0].id, 'Build a Simple Chatbot', '2026-04-22');
  await insAsg.run(courseIds[0].id, 'Neural Network Visualization', '2026-04-04');

  const insEnroll = stmt(pool, `INSERT INTO enrollments (user_id, course_id, progress) VALUES (?,?,?)`);
  await insEnroll.run(aliceId, courseIds[0].id, coursesData[0].progress);

  const lessonRows = await stmt(pool, `SELECT id FROM lessons WHERE course_id = ? ORDER BY sort_order`).all(
    courseIds[0].id
  );
  const insLP = stmt(pool, `INSERT INTO lesson_progress (user_id, lesson_id, completed) VALUES (?,?,?)`);
  for (let i = 0; i < 3; i++) {
    await insLP.run(aliceId, lessonRows[i].id, true);
  }
  for (let i = 3; i < lessonRows.length; i++) {
    await insLP.run(aliceId, lessonRows[i].id, false);
  }

  await stmt(pool, `INSERT INTO test_attempts (user_id, test_id, score, completed) VALUES (?,?,?,?)`).run(
    aliceId,
    t1,
    90,
    true
  );

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const hours = [2, 3, 1.5, 4, 2.5, 3.5, 2];
  const insWA = stmt(pool, `INSERT INTO weekly_activity (user_id, day_label, hours, sort_order) VALUES (?,?,?,?)`);
  for (let i = 0; i < days.length; i++) {
    await insWA.run(aliceId, days[i], hours[i], i);
  }

  await stmt(pool, `INSERT INTO profile_completed_courses (user_id, title, completed_date, grade) VALUES (?,?,?,?)`).run(
    aliceId,
    'Python Programming Basics',
    '2026-02-15',
    95
  );
  await stmt(pool, `INSERT INTO profile_completed_courses (user_id, title, completed_date, grade) VALUES (?,?,?,?)`).run(
    aliceId,
    'Data Structures',
    '2026-03-10',
    88
  );
  await stmt(pool, `INSERT INTO profile_completed_courses (user_id, title, completed_date, grade) VALUES (?,?,?,?)`).run(
    aliceId,
    'Introduction to Algorithms',
    '2026-03-28',
    92
  );

  const insTrend = stmt(pool, `INSERT INTO enrollment_trend (month_label, student_count) VALUES (?,?)`);
  const trendMonths = ['Jan', 'Feb', 'Mar', 'Apr'];
  const trendCounts = [180, 200, 225, 245];
  for (let i = 0; i < trendMonths.length; i++) {
    await insTrend.run(trendMonths[i], trendCounts[i]);
  }

  const insCC = stmt(pool, `INSERT INTO course_completion_stats (course_short_name, completion_percent) VALUES (?,?)`);
  const ccRows = [
    ['AI Intro', 85],
    ['ML Basics', 72],
    ['Neural Nets', 68],
    ['NLP', 55],
    ['Computer Vision', 48],
  ];
  for (const [n, p] of ccRows) {
    await insCC.run(n, p);
  }

  const insAct = stmt(
    pool,
    `INSERT INTO recent_activity (student_name, action, course_name, time_ago, sort_order) VALUES (?,?,?,?,?)`
  );
  const actRows = [
    ['Alice Johnson', 'Completed', 'AI Introduction', '2 hours ago', 0],
    ['Bob Smith', 'Submitted', 'ML Basics - Assignment 1', '4 hours ago', 1],
    ['Carol White', 'Started', 'Neural Networks', '5 hours ago', 2],
    ['David Brown', 'Completed', 'NLP Quiz 2', '6 hours ago', 3],
  ];
  for (const a of actRows) {
    await insAct.run(...a);
  }

  const insSug = stmt(pool, `INSERT INTO ai_suggestions (sort_order, text) VALUES (?,?)`);
  const sugTexts = [
    'Explain what machine learning is',
    'What is the difference between AI and ML?',
    'Help me understand neural networks',
    'Give me tips for the upcoming test',
  ];
  for (let i = 0; i < sugTexts.length; i++) {
    await insSug.run(i, sugTexts[i]);
  }

  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('platformName', 'EduLearn Platform');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('platformNameShort', 'EduLearn');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run(
    'loginSubtitle',
    'Sign in to continue your learning journey'
  );
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('registerTitle', 'Join EduLearn');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run(
    'registerSubtitle',
    'Create your student account'
  );
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run(
    'aiWelcomeMessage',
    "Hello! I'm your AI learning assistant. I can help you understand AI concepts, answer questions about your courses, and assist with your homework. How can I help you today?"
  );
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run(
    'aiAssistantSubtitle',
    'Always here to help with your learning'
  );
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('aiProTipTitle', 'Pro Tip');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run(
    'aiProTipBody',
    'Ask specific questions about your course content for the most helpful responses!'
  );
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('learningDaysValue', '45');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run(
    'studyWeekSubtitle',
    '+2.5 hrs from last week'
  );
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('adminChangeTotalStudents', '+12');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('adminChangeTotalCourses', '+3');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('adminChangeSubmissions', '+24');
  await stmt(pool, `INSERT INTO app_config (key, value) VALUES (?,?)`).run('adminChangeAvgCompletion', '+5%');

  const kk = {
    dashboard: 'Басты бет',
    courses: 'Курстар',
    aiAssistant: 'AI Көмекші',
    profile: 'Профиль',
    settings: 'Параметрлер',
    students: 'Студенттер',
    courseManagement: 'Курстарды басқару',
    welcome: 'Қош келдіңіз',
    learningProgress: 'Оқу прогресі',
    enrolledCourses: 'Тіркелген курстар',
    continueLesson: 'Сабақты жалғастыру',
    takeTest: 'Тест тапсыру',
    myProgress: 'Менің прогресім',
    completed: 'Аяқталды',
    inProgress: 'Процесте',
    notStarted: 'Басталмаған',
    searchCourses: 'Курстарды іздеу...',
    allCourses: 'Барлық курстар',
    myEnrolledCourses: 'Менің курстарым',
    openCourse: 'Курсты ашу',
    progress: 'Прогресс',
    lessons: 'Сабақтар',
    materials: 'Материалдар',
    tests: 'Тесттер',
    assignments: 'Тапсырмалар',
    description: 'Сипаттама',
    downloadMaterials: 'Материалдарды жүктеу',
    externalLinks: 'Сыртқы сілтемелер',
    uploadFile: 'Файлды жүктеу',
    addLink: 'Сілтеме қосу',
    submit: 'Жіберу',
    startTest: 'Тестті бастау',
    question: 'Сұрақ',
    submitTest: 'Тестті жіберу',
    timeRemaining: 'Қалған уақыт',
    askQuestion: 'Сұрақ қойыңыз...',
    send: 'Жіберу',
    suggestions: 'Ұсыныстар',
    explainTopic: 'Тақырыпты түсіндіру',
    helpWithHomework: 'Үй жұмысына көмек',
    myProfile: 'Менің профилім',
    completedCourses: 'Аяқталған курстар',
    overallProgress: 'Жалпы прогресс',
    editProfile: 'Профильді өңдеу',
    changePassword: 'Құпия сөзді өзгерту',
    selectLanguage: 'Тілді таңдау',
    darkMode: 'Қараңғы режим',
    lightMode: 'Жарық режим',
    totalStudents: 'Барлық студенттер',
    totalCourses: 'Барлық курстар',
    submissions: 'Тапсырмалар',
    statistics: 'Статистика',
    addCourse: 'Курс қосу',
    editCourse: 'Курсты өңдеу',
    deleteCourse: 'Курсты жою',
    viewProgress: 'Прогресті қарау',
    grade: 'Баға',
    feedback: 'Кері байланыс',
    save: 'Сақтау',
    cancel: 'Болдырмау',
    delete: 'Жою',
    edit: 'Өңдеу',
    view: 'Қарау',
    add: 'Қосу',
    search: 'Іздеу',
    filter: 'Сүзгі',
    logout: 'Шығу',
    enrollNow: 'Тіркелу',
    retakeTest: 'Қайта тапсыру',
    lessonsLabel: 'сабақ',
    avgCompletion: 'Орташа аяқтау',
    certificates: 'Сертификаттар',
    avgScore: 'Орташа балл',
    continueLearning: 'Оқуды жалғастыру',
    viewAll: 'Барлығын қарау',
    weeklyActivity: 'Апталық белсенділік',
    quickActions: 'Жылдам әрекеттер',
    learningStats: 'Оқу статистикасы',
    thisWeek: 'Осы апта',
    dashboardSubtitle: 'Оқу жолыңызды жалғастырыңыз',
    coursesSubtitle: 'Курстарды зерттеңіз және тіркеліңіз',
    materialsSubtitle: 'Курс материалдарына қол жеткізіңіз',
    testsSubtitle: 'Біліміңізді тексеріңіз',
    assignmentsSubtitle: 'Тапсырмаларды жіберіңіз',
    keyLearningPoints: 'Негізгі оқу нүктелері:',
    settingsPageSubtitle: 'Параметрлерді басқарыңыз',
    appearance: 'Көрініс',
    appearanceHintLight: 'Қараңғы темаға ауысу',
    appearanceHintDark: 'Жарық темаға ауысу',
    notifications: 'Хабарландырулар',
    emailNotifications: 'Электрондық пошта хабарландырулары',
    emailNotificationsHint: 'Курстарыңыз туралы жаңартулар алыңыз',
    adminDashboardTitle: 'Әкімші панелі',
    adminDashboardSubtitle: 'Платформа шолуы және аналитика',
    studentEnrollmentTrend: 'Студенттер тренді',
    courseCompletionRates: 'Курсты аяқтау деңгейі',
    recentActivity: 'Соңғы белсенділік',
    fullName: 'Толық аты',
    email: 'Email',
    password: 'Құпия сөз',
    currentPassword: 'Ағымдағы құпия сөз',
    newPassword: 'Жаңа құпия сөз',
    confirmPassword: 'Қайталау',
    signIn: 'Кіру',
    registerStudent: 'Студент ретінде тіркелу',
    createAccount: 'Аккаунт құру',
    haveAccount: 'Аккаунт бар ма?',
    noAccount: 'Аккаунт жоқ па?',
    onlyStudentsRegister: 'Тек студенттер тіркеле алады. Әкімші аккаунттары бөлек беріледі.',
    totalCoursesStat: 'Барлық курстар',
    completedStat: 'Аяқталған',
    averageScoreStat: 'Орташа балл',
    learningDaysStat: 'Оқу күндері',
    lessonsWord: 'сабақ',
    weeksSuffix: 'апта',
    dueDate: 'Мерзімі',
    submitted: 'Жіберілді',
    previous: 'Алдыңғы',
    next: 'Келесі',
    questionNavigator: 'Сұрақтарға өту',
    courseTitle: 'Курс атауы',
    statusLabel: 'Күйі',
    deleteCourseConfirm: 'Бұл курсты жою керек пе?',
    passwordMismatch: 'Құпия сөздер сәйкес емес',
    passwordTooShort: 'Кемінде 6 таңба болуы керек',
    downloadFile: 'Файлды жүктеу',
    openLink: 'Сілтемені ашу',
  };

  const insI18n = stmt(pool, `INSERT INTO i18n_strings (locale, key, value) VALUES (?,?,?)`);
  for (const [k, v] of Object.entries(kk)) {
    await insI18n.run('kk', k, v);
  }

  const copyEn = { ...kk };
  Object.assign(copyEn, {
    dashboard: 'Dashboard',
    courses: 'Courses',
    enrollNow: 'Enroll Now',
    retakeTest: 'Retake Test',
    lessonsLabel: 'lessons',
    avgCompletion: 'Avg. Completion',
    certificates: 'Certificates',
    avgScore: 'Avg Score',
    continueLearning: 'Continue Learning',
    viewAll: 'View All',
    weeklyActivity: 'Weekly Activity',
    quickActions: 'Quick Actions',
    learningStats: 'Learning Stats',
    thisWeek: 'This Week',
    dashboardSubtitle: 'Continue your learning journey',
    coursesSubtitle: 'Explore and enroll in courses',
    materialsSubtitle: 'Access course materials and resources',
    testsSubtitle: 'Test your knowledge and track your progress',
    assignmentsSubtitle: 'Submit your assignments and track deadlines',
    keyLearningPoints: 'Key Learning Points:',
    settingsPageSubtitle: 'Manage your settings',
    appearance: 'Appearance',
    appearanceHintLight: 'Switch to dark theme',
    appearanceHintDark: 'Switch to light theme',
    notifications: 'Notifications',
    emailNotifications: 'Email Notifications',
    emailNotificationsHint: 'Receive updates about your courses',
    adminDashboardTitle: 'Admin Dashboard',
    adminDashboardSubtitle: 'Platform overview and analytics',
    studentEnrollmentTrend: 'Student Enrollment Trend',
    courseCompletionRates: 'Course Completion Rates',
    recentActivity: 'Recent Activity',
    fullName: 'Full Name',
    email: 'Email',
    password: 'Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    signIn: 'Sign In',
    registerStudent: 'Register as Student',
    createAccount: 'Create Account',
    haveAccount: 'Already have an account?',
    noAccount: "Don't have an account?",
    onlyStudentsRegister: 'Only students can register. Admin accounts are provided separately.',
    totalCoursesStat: 'Total Courses',
    completedStat: 'Completed',
    averageScoreStat: 'Average Score',
    learningDaysStat: 'Learning Days',
    lessonsWord: 'lessons',
    weeksSuffix: 'weeks',
    dueDate: 'Due',
    submitted: 'Submitted',
    previous: 'Previous',
    next: 'Next',
    questionNavigator: 'Question Navigator',
    courseTitle: 'Course title',
    statusLabel: 'Status',
    deleteCourseConfirm: 'Delete this course?',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    downloadFile: 'Download file',
    openLink: 'Open link',
  });

  for (const [k, v] of Object.entries(copyEn)) {
    if (typeof v === 'string') await insI18n.run('en', k, v);
  }

  const enForRu = await stmt(pool, `SELECT key, value FROM i18n_strings WHERE locale = 'en'`).all();
  for (const row of enForRu) {
    await insI18n.run('ru', row.key, row.value);
  }

  const submissionRows = await stmt(pool, `SELECT id FROM assignments WHERE course_id = ? ORDER BY id`).all(
    courseIds[0].id
  );
  const sub1 = stmt(
    pool,
    `INSERT INTO assignment_submissions (user_id, assignment_id, file_url, link_url, submitted_at, status, score, feedback) VALUES (?,?,?,?,?,?,?,?)`
  );
  await sub1.run(aliceId, submissionRows[0].id, '#', 'https://docs.google.com/document/example', '2026-04-05', 'pending', null, null);

  const bob = (await stmt(pool, `SELECT id FROM users WHERE email = ?`).get('bob@example.com')).id;
  await sub1.run(bob, submissionRows[1].id, '#', '', '2026-04-06', 'pending', null, null);

  const carol = (await stmt(pool, `SELECT id FROM users WHERE email = ?`).get('carol@example.com')).id;
  await sub1.run(carol, submissionRows[2].id, '#', 'https://github.com/example/project', '2026-04-04', 'graded', 95, 'Great work!');

  console.log('Database seeded. Demo student: alice@example.com / student123');
}

