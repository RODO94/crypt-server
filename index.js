const express = require("express");
const app = express();
const cors = require("cors");
const knex = require("knex")(require("./knexfile"));

require("dotenv").config();

app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 8080;

const userRoutes = require("./routes/users-routes");
const battlesRoutes = require("./routes/battles-routes");
const rankingsRoutes = require("./routes/rankings-routes");
const armiesRoutes = require("./routes/armies-routes");

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/users", userRoutes);
app.use("/battles", cors(), battlesRoutes);
app.use("/rankings", cors(), rankingsRoutes);
app.use("/armies", cors(), armiesRoutes);

app.listen(PORT, () => {
  console.log(`running at ${process.env.BASE_URL}${PORT}`);
});
