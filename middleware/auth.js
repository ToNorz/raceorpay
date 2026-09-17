const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  // Accept token via httpOnly cookie or Authorization header
  const bearer = req.headers['authorization'];
  const tokenFromHeader = bearer && bearer.startsWith('Bearer ')
    ? bearer.slice(7)
    : null;
  const token = req.cookies?.token || tokenFromHeader;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

module.exports = authMiddleware;
