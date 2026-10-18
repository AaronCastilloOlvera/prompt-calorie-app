import { Route, Routes } from "react-router";

import NavBar from "./components/NavBar";
import ExerciseDetailPage from "./pages/ExerciseDetailPage";
import ExercisesPage from "./pages/ExercisesPage";
import TodayPage from "./pages/TodayPage";
import WeekPage from "./pages/WeekPage";
import WeightPage from "./pages/WeightPage";

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pt-4 pb-20">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/semana" element={<WeekPage />} />
        <Route path="/peso" element={<WeightPage />} />
        <Route path="/ejercicios" element={<ExercisesPage />} />
        <Route path="/ejercicios/:name" element={<ExerciseDetailPage />} />
      </Routes>
      <NavBar />
    </div>
  );
}
