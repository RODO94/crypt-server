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

app.use("/", (req, res, next) => {
  console.log("Index File Pool in Use", pool.numUsed());
  console.log("Index File Pool free", pool.numFree());
  next();
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/users", userRoutes);
app.use("/battles", battlesRoutes);
app.use("/rankings", rankingsRoutes);
app.use("/armies", armiesRoutes);
app.listen(PORT, () => {
  console.log(`running at ${process.env.BASE_URL}${PORT}`);
});
