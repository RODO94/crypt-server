import { Router } from "express";
import { client } from "../database/db.js";

import {
  fetchAllRankings,
  fetchTopFiveRanking,
  fetchOneRanking,
  fetchAllArmyRankings,
} from "../controllers/rankings-controllers.js";
const rankingRouter = Router();
const pool = client.pool;
// database.on("query", (builder) => {
//   console.log("Ranking Routes to be executed", builder.sql);
//   console.log("Ranking Routes Pool Used on Start", pool.numUsed());
//   console.log("Ranking Routes Pool Used on Start", pool.numPendingAcquires());

//   console.log("Ranking Routes Pool Free on Start", pool.numFree());
// });

// database.on("query-response", (response, builder) => {
//   console.log("Ranking Routes Query executed successfully:", builder.sql);
//   console.log("Ranking Routes Pool Used on response", pool.numUsed());
//   console.log("Ranking Routes Pool Free on response", pool.numFree());
// });

// database.on("query-error", (error, builder) => {
//   console.error("Error executing query:", builder.sql, error);
//   console.log("Ranking Routes Error Pool Used on error", pool.numUsed());
//   console.log("Ranking Routes Error Pool Free on error", pool.numFree());
// });

rankingRouter.route("/all").get(fetchAllRankings);
rankingRouter.route("/top5").get(fetchTopFiveRanking);
rankingRouter.route("/:id").get(fetchOneRanking);
rankingRouter.route("/:id/all").get(fetchAllArmyRankings);
export default rankingRouter;
