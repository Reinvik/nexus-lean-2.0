import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LoadingScreen from '../common/LoadingScreen';

interface ProtectedRouteProps {
  children?: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireAdmin = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen message="Verificando credenciales..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requireAdmin && !user.canAccessAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children ? <>{children}</> : null;
};

export default ProtectedRoute;
