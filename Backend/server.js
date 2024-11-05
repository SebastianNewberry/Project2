// Required dependencies
const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const bodyParser = require("body-parser");
const cors = require("cors");
const dbService = require("./dbService");

const app = express();

// Middleware to parse JSON data and handle CORS (Cross-Origin Resource Sharing)
app.use(bodyParser.json());
app.use(cors());

// Create a MySQL connection
const db = mysql.createConnection({
  host: "localhost", // Database host, usually 'localhost' in local development
  user: "root", // Default username in XAMPP
  password: "", // Leave blank if no password is set in XAMPP
  database: "jwt_auth_db", // Database name
});

// Connect to the MySQL database
db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err.stack);
    return;
  }
  console.log("Connected to MySQL database.");
});

// Start the server and listen on port 5000
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});

// User registration route
app.post("/register", async (req, res) => {
  const { username, email, password } = req.body; // Extract username, email, and password from request body
  const hashedPassword = await bcrypt.hash(password, 10); // Hash the password using bcrypt with 10 salt rounds

  const db = dbService.getDbServiceInstance();

  // Insert the new user into the 'users' table
  db.query(
    "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
    [username, email, hashedPassword],
    (err, result) => {
      if (err) {
        return res
          .status(500)
          .json({ message: "User registration failed", error: err }); // Send error response if registration fails
      }
      res.status(201).json({ message: "User registered successfully" }); // Send success response
    }
  );
});

// User login route
app.post("/login", (req, res) => {
  const { username, password } = req.body; // Extract username and password from request body

  // Query the database for the user with the provided username
  db.query(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err, results) => {
      if (err || results.length === 0) {
        return res.status(400).json({ message: "User not found" }); // Send error response if user is not found
      }

      const user = results[0]; // Get the user record from the query result
      const passwordMatch = await bcrypt.compare(password, user.password); // Compare the provided password with the hashed password

      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" }); // Send error response if the password does not match
      }

      // Generate a JWT token with the user ID and a secret key, valid for 3 hour
      const token = jwt.sign({ userId: user.id }, "your_jwt_secret", {
        expiresIn: "3h",
      });

      // Send the JWT token as the response
      res.json({ token });
    }
  );
});

// Middleware function to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]; // Get the token from the 'Authorization' header

  if (!token) return res.status(401).json({ message: "Access denied" }); // If no token is provided, deny access

  // Verify the JWT token
  jwt.verify(token, "your_jwt_secret", (err, user) => {
    if (err) return res.status(403).json({ message: "Invalid token" }); // If the token is invalid, send a 403 error
    req.user = user; // Store the decoded user data in the request object
    next(); // Proceed to the next middleware/route handler
  });
};

// Protected route that requires JWT authentication
app.get("/dashboard", authenticateToken, (req, res) => {
  res.json({ message: "Welcome to the dashboard. You are authenticated!" }); // Send a success message if authentication is valid
});

app.get("/profile", authenticateToken, (req, res) => {
  const userId = req.user.userId; // Extract userId from the decoded JWT token

  // Query the database to get the user data based on the userId
  db.query(
    "SELECT username, email FROM users WHERE id = ?",
    [userId],
    (err, result) => {
      if (err || result.length === 0) {
        return res.status(404).json({ message: "User not found" }); // Send error if user not found
      }

      // Send user profile data as response
      res.json({ username: result[0].username, email: result[0].email });
    }
  );
});
