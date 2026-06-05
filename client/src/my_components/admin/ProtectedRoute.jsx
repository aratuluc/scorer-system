import React from "react";
import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  // Check if the wristband exists in browser memory
  const token = localStorage.getItem("admin_token");

  // If no token, instantly teleport them back to the login page
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // If they have a token, render whatever component is inside the route (<Outlet />)
  return <Outlet />;
}
