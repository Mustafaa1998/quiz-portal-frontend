import { Routes, Route } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import PrivateRoute from "./auth/PrivateRoute";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import AttemptPage from "./pages/AttemptPage";
import ResultPage from "./pages/ResultPage";
import TakeQuizPage from "./pages/TakeQuizPage";
import InstructorPage from "./pages/InstructorPage";
import AttemptDetailPage from "./pages/AttemptDetailPage";
import AdminDashboard from "./pages/AdminDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import QuizListPage from "./pages/QuizListPage";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import LandingPage from "./pages/LandingPage";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard"element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>} />
        <Route path="/quizzes"element={<PrivateRoute><Layout><QuizListPage /></Layout></PrivateRoute> }/>
        <Route path="/quiz/:quizId/take"element={<PrivateRoute><Layout><TakeQuizPage /></Layout></PrivateRoute>}/>
        <Route path="/quiz/:quizId/attempts/:attemptId"element={<PrivateRoute><Layout><AttemptPage /> </Layout></PrivateRoute>}/>
        <Route path="/quiz/:quizId/attempts/:attemptId/result"element={ <PrivateRoute> <Layout><ResultPage /></Layout></PrivateRoute>}/>
        <Route path="/instructor" element={ <PrivateRoute roles={["INSTRUCTOR"]}> <Layout> <InstructorPage /> </Layout> </PrivateRoute>}/>
        <Route path="/quiz/:quizId/attempts/:attemptId/detail"element={<PrivateRoute roles={["INSTRUCTOR"]}><Layout><AttemptDetailPage /></Layout></PrivateRoute>}/>
        <Route path="/admin"element={<PrivateRoute roles={["ADMIN"]}><Layout><AdminDashboard /></Layout></PrivateRoute>}/>
        <Route path="/student"element={<PrivateRoute roles={["STUDENT"]}><Layout><StudentDashboard /></Layout></PrivateRoute>}/>
        <Route path="/forbidden" element={<Forbidden />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
}
