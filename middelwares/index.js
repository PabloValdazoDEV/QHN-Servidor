require("dotenv").config();

const jwt = require("jsonwebtoken");

const allowedOrigins = process.env.ALLOWED_ORIGINS;

const authMiddleware = (req, res, next) => {
    const token = req.header("Authorization")?.split(" ")[1];
    const apiKey = req.header("x-api-key");
    const origin = req.headers.origin; 

    if (allowedOrigins.includes(origin)) {
        return next();
    }

    if (apiKey && apiKey === process.env.API_KEY) {
        return next();
    }

    if (!token) {
        return res.status(401).json({ message: "Unauthorized: Provide a valid JWT or API Key" });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        res.status(403).json({ message: "Invalid token" });
    }
};

module.exports = authMiddleware;