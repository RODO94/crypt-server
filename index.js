const express = require("express");
const app = express();
const cors = require("cors");
const knex = require("knex")(require("./knexfile"));

require("dotenv").config();

app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

const activeConnections = new Map();

const userRoutes = require("./routes/users-routes");
const battlesRoutes = require("./routes/battles-routes");
const rankingsRoutes = require("./routes/rankings-routes");
const armiesRoutes = require("./routes/armies-routes");

const pool = knex.client.pool;

// Monitor connection pool

knex.on("start", (builder) => {
  console.log("New query being executed:", builder.sql);
});

knex.on("query-response", (response, builder) => {
  console.log("Query executed successfully:", builder.sql);
});

knex.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

console.log("Connections available:", pool.numFree());
console.log("Connections in use:", pool.numUsed());

app.use("/users", userRoutes);
app.use("/battles", battlesRoutes);
app.use("/rankings", rankingsRoutes);
app.use("/armies", armiesRoutes);
app.listen(PORT, () => {
  console.log(`running at ${process.env.BASE_URL}${PORT}`);
});
