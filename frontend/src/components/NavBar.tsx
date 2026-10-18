import { NavLink } from "react-router";

const links = [
  { to: "/", label: "Hoy" },
  { to: "/semana", label: "Semana" },
  { to: "/peso", label: "Peso" },
  { to: "/ejercicios", label: "Ejercicios" },
];

export default function NavBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 flex border-t border-gray-200 bg-white">
      {links.map((l) => (
        <NavLink
          key={l.to}
          to={l.to}
          end={l.to === "/"}
          className={({ isActive }) =>
            `flex-1 py-3 text-center text-sm ${isActive ? "font-semibold text-emerald-600" : "text-gray-500"}`
          }
        >
          {l.label}
        </NavLink>
      ))}
    </nav>
  );
}
