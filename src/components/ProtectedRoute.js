import { Navigate } from 'react-router-dom';
import { getSession } from '../auth';

export default function ProtectedRoute({ children }) {
  const session = getSession();
  return session ? children : <Navigate to="/" replace />;
}
