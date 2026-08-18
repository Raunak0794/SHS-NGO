const jwt = require("jsonwebtoken");
const { isTokenBlacklisted } = require("../utils/tokenBlacklist");

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET || "dev-secret-change-me";
  return String(secret).replace(/\s+/g, "").trim();
};

const getTokenFromRequest = (req) => {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  if (typeof authHeader === "string" && authHeader.trim()) {
    return authHeader.trim();
  }

  if (req.headers?.["x-auth-token"]) {
    return String(req.headers["x-auth-token"]).trim();
  }

  if (req.query?.token) {
    return String(req.query.token).trim();
  }

  if (req.body?.token) {
    return String(req.body.token).trim();
  }

  const cookiesHeader = req.headers?.cookie;
  if (cookiesHeader) {
    const tokenCookie = cookiesHeader
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('token='));

    if (tokenCookie) {
      return decodeURIComponent(tokenCookie.split('=').slice(1).join('='));
    }
  }

  return req.cookies?.token || null;
};

const authMiddleware = async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      if (await isTokenBlacklisted(token)) {
        return res.status(401).json({ message: "Session has expired" });
      }
    } catch (redisErr) {
      console.warn("Redis blacklist check failed, continuing auth:", redisErr.message);
    }

    const decoded = jwt.verify(token, getJwtSecret());
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = authMiddleware;
