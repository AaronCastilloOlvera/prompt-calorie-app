import { Route, Routes } from "react-router";

import NavBar from "./components/NavBar";
import PlaceholderPage from "./pages/PlaceholderPage";
import TodayPage from "./pages/TodayPage";
import WeightPage from "./pages/WeightPage";

export default function App() {
  return (
    <div className="mx-auto min-h-screen max-w-xl px-4 pt-4 pb-20">
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/semana" element={<PlaceholderPage title="Semana" />} />
        <Route path="/peso" element={<WeightPage />} />
        <Route path="/ejercicios" element={<PlaceholderPage title="Ejercicios" />} />
      </Routes>
      <NavBar />
    </div>
  );
}
