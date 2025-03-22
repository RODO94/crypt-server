import express, { json } from "express";
import { cors } from "cors";
const app = express();
const knex = require("knex")(require("./knexfile"));

require("dotenv").config();

app.use(json());
app.use(cors());
const PORT = process.env.PORT || 8080;

import battleRouter from "./routes/battles-routes.js";
import rankingRouter from "./routes/rankings-routes.js";
import userRouter from "./routes/users-routes.js";
import armyRouter from "./routes/armies-routes.js";

app.get("/", (req, res) => {
  res.send("Hello World");
});

app.use("/users", userRouter);
app.use("/battles", battleRouter);
app.use("/rankings", rankingRouter);
app.use("/armies", armyRouter);
app.listen(PORT, () => {
  console.log(`running at ${process.env.BASE_URL}${PORT}`);
});
