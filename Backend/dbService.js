// database services, accessbile by DbService methods.

const mysql = require("mysql");
const dotenv = require("dotenv");
dotenv.config(); // read from .env file

let instance = null;

const connection = mysql.createConnection({
  host: process.env.HOST,
  user: process.env.USER,
  password: process.env.PASSWORD,
  database: process.env.DATABASE,
  port: process.env.DB_PORT,
});

connection.connect((err) => {
  if (err) {
    console.log(err.message);
  }
  console.log("db " + connection.state); // to see if the DB is connected or not
});

// the following are database functions,

class DbService {
  static getDbServiceInstance() {
    // only one instance is sufficient
    return instance ? instance : new DbService();
  }

  // Stuff for project
  // not sure what the t
  /* table idea
  CREATE TABLE Users(
    userid VARCHAR(50) PRIMARY KEY,
    firstname VARCHAR(50),
    lastname VARCHAR(50),
    password VARCHAR(50),
    salary FLOAT,
    age INTEGER,
    registerday DATETIME,
    signintime DATETIME.
 )
    */

  // Add a date and a datetime for registeruser?
  //Need to update signintime and return user data may be an easier way than doing it in two calls
  // Need to change * to not include password or need to add a second table for password

  // for never signed in signintime = null or registerday is the same day as signintime
  // how to handle the three casses of first name, last name or both for name search
  // case three different database calls

  //using user id to get number to pass into register after
  // Date vs DateTime for regiserday

  async newUser(userID, password, firstname, lastname, salary, age) {
    try {
      const dateAdded = new Date().toISOString();
      // use await to call an asynchronous function
      const insertId = await new Promise((resolve, reject) => {
        const query =
          "INSERT INTO Users (userID, password, firstname, lastname, salary, age, registerday, signintime) VALUES (?, ?, ?, ?, ?, ?, ?, ?);";
        connection.query(
          query,
          [userID, password, firstname, lastname, salary, age, dateAdded, null],
          (err, result) => {
            if (err) reject(new Error(err.message));
            else resolve(result.insertId);
          }
        );
      });
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async userSignIn(userID, password, datetime) {
    try {
      await new Promise((resolve, reject) => {
        const query =
          "UPDATE Users SET signintime = ? WHERE userid = ? AND password = ?;";
        connection.query(query, [datetime, userID, password], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });
    } catch (error) {
      throw new Error(error.message);
    }
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM users where userid = ? AND password = ?;";
        connection.query(query, [userID, password], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      if (response.length == 0) {
        throw new Error("Invalid username or password. Please try again.");
      }
      return response;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async userIDSearch(userID) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where userid = ?";
        connection.query(query, [userID], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      return response;
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async salarySearch(salaryH, salaryL) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where salary > ? AND salary < ?";
        connection.query(query, [salaryL, salaryH], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });
      return response;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async ageSearch(ageH, ageL) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where age > ? AND age < ?";
        connection.query(query, [ageL, ageH], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      return response;
    } catch (error) {
      throw new Error(err.message);
    }
  }

  async searchUsersAfterJohnRegistered() {
    try {
      const firstQuery =
        "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users WHERE userId = 'John'";

      const [firstResult] = await new Promise((resolve, reject) => {
        connection.query(firstQuery, (err, result) => {
          console.log(result);
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      if (!firstResult || firstResult.length === 0) {
        throw new Error("User John not found.");
      }

      const query =
        "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users WHERE registerday > ?";
      const usersAfterJohn = await new Promise((resolve, reject) => {
        connection.query(query, [firstResult.registerday], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      if (usersAfterJohn.length === 0) {
        throw new Error("No users found after John registered.");
      }

      return usersAfterJohn;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async searchUsersSameDayJohnRegistered() {
    try {
      const [firstResponse] = await new Promise(async (resolve, reject) => {
        const firstQuery =
          "SELECT registerday FROM Users where userId = 'John'";
        connection.query(firstQuery, [], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      if (!firstResponse) {
        throw new Error("User John not found");
      } else {
        const response = await new Promise(async (resolve, reject) => {
          const query =
            "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where DATE(registerday) = DATE(?)";
          connection.query(
            query,
            [firstResponse.registerday],
            (err, result) => {
              if (err) reject(new Error(err.message));
              else resolve(result);
            }
          );
        });
        return response;
      }
    } catch (err) {
      throw new Error(err.message);
    }
  }

  // I split this into two queries probablty is a better way to do this
  async sameDate(userID) {
    try {
      const date = await new Promise((resolve, reject) => {
        const query = "SELECT registerday FROM Users where userID = ?";
        connection.query(query, [userID], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      if (!date[0]) {
        throw new Error("User not found");
      }
      const newDate = date[0].registerday;

      const formattedDate = new Date(newDate).toISOString().split("T")[0];

      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where DATE(registerday) = ?;";
        connection.query(query, [formattedDate], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });
      console.log(response);
      return response;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async nologin() {
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where signintime IS NULL;";
        connection.query(query, [], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });
      return response;
    } catch (error) {
      console.log(error);
    }
  }

  async searchForFirstName(firstname) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where firstname = ?";
        connection.query(query, [firstname], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      return response;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async searchForLastName(lastName) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where lastname = ?";
        connection.query(query, [lastName], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      return response;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async searchForFirstAndLastName(firstName, lastName) {
    try {
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where firstname = ? and lastname = ?";
        connection.query(query, [firstName, lastName], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      return response;
    } catch (err) {
      throw new Error(err.message);
    }
  }

  async registeredToday() {
    try {
      const today = new Date().toISOString().split("T")[0] + " 00:00:00";
      console.log(today);
      const response = await new Promise((resolve, reject) => {
        const query =
          "SELECT userID, firstname, lastname, salary, age, registerday, signintime FROM Users where DATE(registerday) = DATE(?)";

        connection.query(query, [today], (err, result) => {
          if (err) reject(new Error(err.message));
          else resolve(result);
        });
      });

      return response;
    } catch (err) {
      throw new Error(err.message);
    }
  }
}

module.exports = DbService;
