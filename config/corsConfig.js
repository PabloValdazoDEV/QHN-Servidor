require("dotenv").config();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175'];

const corsConfig = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: "GET, POST, PUT, DELETE, OPTIONS",
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "Accept",
    "Origin",
    "User-Agent",
  ],
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = corsConfig;
