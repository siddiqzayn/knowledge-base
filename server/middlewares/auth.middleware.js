import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

export const verifyToken = (req, res, next) => {
  // Extract token from 'Authorization: Bearer TOKEN' header
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) {
    console.log("No token provided for authentication.");
    return res.status(401).json({ error: 'No token provided' });
  }

  // Verify the token using the JWT_SECRET
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.log("Invalid token:", err.message);
      // Return 403 Forbidden if token is invalid or expired
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    // Attach decoded user information (id, email) to the request object
    req.user = decoded;
    next(); // Proceed to the next middleware/route handler
  });
};