import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Authentication middleware
export const authenticateToken = (req, res, next) => {
    // Get token from cookies
    const token = req.cookies.token;
    
    if (!token) {
        console.log('No token found in cookies');
        return res.status(401).json({ error: 'Access token required' });
    }
    
    try {
        // Verify token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Token verification failed:', error.message);
        return res.status(403).json({ error: 'Invalid or expired token' });
    }
};

export default authenticateToken;