const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");

const app = express();
const clientOrigin = process.env.CLIENT_URL
  ? new URL(process.env.CLIENT_URL).origin
  : "http://localhost:5173";

app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "LearnSphere API is running",
  });
});

app.use("/api/auth", authRoutes);

module.exports = app;