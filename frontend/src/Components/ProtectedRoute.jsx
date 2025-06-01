import { Navigate } from 'react-router-dom';
import Cookies from 'js-cookie';

const ProtectedRoute = ({ element }) => {
    const token = Cookies.get('token');
    const email = localStorage.getItem('email');

    // Check if either token or email is missing
    if (!token || !email) {
        return <Navigate to="/signin" replace />;
    }

    return element;
};

export default ProtectedRoute;