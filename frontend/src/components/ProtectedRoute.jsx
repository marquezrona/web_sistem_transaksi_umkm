import { useAuth } from "@/context/AuthContext";
import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedRoute({ children, role }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: loc }} />;
  if (role && user.role !== role) {
    return <Navigate to={user.role === "admin" ? "/admin" : "/umkm"} replace />;
  }
  return children;
}
