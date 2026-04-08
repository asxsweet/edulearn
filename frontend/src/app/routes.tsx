import { createBrowserRouter, Navigate } from 'react-router';
import RootLayout from './components/layout/RootLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';
import Test from './pages/Test';
import AIAssistant from './pages/AIAssistant';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import AdminDashboard from './pages/admin/AdminDashboard';
import CourseManagement from './pages/admin/CourseManagement';
import StudentManagement from './pages/admin/StudentManagement';
import StudentProgress from './pages/admin/StudentProgress';
import CourseCreation from './pages/admin/CourseCreation';
import SubmissionReview from './pages/admin/SubmissionReview';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute allowedRole="student">
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'courses',
        element: (
          <ProtectedRoute allowedRole="student">
            <Courses />
          </ProtectedRoute>
        ),
      },
      {
        path: 'courses/:id',
        element: (
          <ProtectedRoute allowedRole="student">
            <CourseDetail />
          </ProtectedRoute>
        ),
      },
      {
        path: 'test/:id',
        element: (
          <ProtectedRoute allowedRole="student">
            <Test />
          </ProtectedRoute>
        ),
      },
      {
        path: 'ai-assistant',
        element: (
          <ProtectedRoute allowedRole="student">
            <AIAssistant />
          </ProtectedRoute>
        ),
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute allowedRole="student">
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRole="admin">
            <AdminDashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/courses',
        element: (
          <ProtectedRoute allowedRole="admin">
            <CourseManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/students',
        element: (
          <ProtectedRoute allowedRole="admin">
            <StudentManagement />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/students/:id',
        element: (
          <ProtectedRoute allowedRole="admin">
            <StudentProgress />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/courses/create',
        element: (
          <ProtectedRoute allowedRole="admin">
            <CourseCreation />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/courses/edit/:id',
        element: (
          <ProtectedRoute allowedRole="admin">
            <CourseCreation />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin/submissions',
        element: (
          <ProtectedRoute allowedRole="admin">
            <SubmissionReview />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
