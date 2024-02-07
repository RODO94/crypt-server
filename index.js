const express = require("express");
const app = express();
const cors = require("cors");

require("dotenv").config();

const PORT = process.env.PORT || 8080;

const userRoutes = require("./routes/users-routes");
const battlesRoutes = require("./routes/battles-routes");
const rankingsRoutes = require("./routes/rankings-routes");
const armiesRoutes = require("./routes/armies-routes");

app.use(express.json());
app.use(cors());

app.use("/").get((req, res) => {
  res.send("Hello World");
});

app.use("/users", userRoutes);
app.use("/battles", battlesRoutes);
app.use("/rankings", rankingsRoutes);
app.use("/armies", armiesRoutes);

app.listen(PORT, () => {
  console.log(`running at ${process.env.BASE_URL}${PORT}`);
});
