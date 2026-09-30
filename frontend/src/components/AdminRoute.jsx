import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminRoute = () => {
  const { user, isStaff } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const staffAllowed = isStaff || user.is_admin || user.role === 'admin' || user.role === 'employee';
  if (!staffAllowed) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
