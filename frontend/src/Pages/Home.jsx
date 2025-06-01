import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { HOST } from '../utils/constants';

const Home = () => {
    const navigate = useNavigate();

    useEffect(() => {
        const verifyUserSession = async () => {
            try {
                // Check if email exists in localStorage
                const email = localStorage.getItem('email');
                if (!email) {
                    navigate('/signIn');
                    return;
                }

                // Verify session with backend
                const response = await axios.get(`${HOST}/api/auth/verify-session`, {
                    withCredentials: true // This ensures cookies are sent
                });

                if (response.data.tokenVerified) {
                    // Redirect based on user role
                    if (response.data.designation.toLowerCase() === 'admin') {
                        navigate('/records');
                    } else {
                        navigate('/dashboard');
                    }
                } else {
                    console.log('Session verification failed');
                    navigate('/signIn');
                }

            } catch (error) {
                console.error('Session verification error:', 
                    error.response?.data?.error || error.message
                );
                navigate('/signIn');
            }
        };

        verifyUserSession();
    }, [navigate]);

    // Show loading state while verifying
    return (
        <div className="h-screen flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
    );
};

export default Home;