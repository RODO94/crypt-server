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

knex.on("acquireConnection", (connection) => {
  const connId = connection.__knexUid;
  activeConnections.set(connId, connection);
  console.log(
    `Acquired connection ${connId}. Total active connections: ${activeConnections.size}`
  );
});

knex.on("releaseConnection", (connection) => {
  const connId = connection.__knexUid;
  activeConnections.delete(connId);
  console.log(
    `Released connection ${connId}. Total active connections: ${activeConnections.size}`
  );
});

knex.on("acquireConnectionTimeout", () => {
  console.error("Failed to acquire connection from pool within timeout");
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/users", userRoutes);
app.use("/battles", battlesRoutes);
app.use("/rankings", rankingsRoutes);
app.use("/armies", armiesRoutes);

setInterval(() => {
  console.log(`Active connections: ${activeConnections.size}`);
}, 60000);

app.listen(PORT, () => {
  console.log(`running at ${process.env.BASE_URL}${PORT}`);
});
