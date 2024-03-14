const knex = require("knex")(require("../knexfile"));
const dayjs = require("dayjs");

const pool = knex.client.pool;

knex.on("start", (builder) => {
  console.log("Array Method Pool Used on Start", pool.numUsed());
  console.log("Array Method Pool Free on Start", pool.numFree());
});

knex.on("query-response", (response, builder) => {
  console.log("Array Method Query executed successfully:", builder.sql);
  console.log("Array Method Pool Used", pool.numUsed());
  console.log("Array Method Pool Free on response", pool.numFree());
});

knex.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
  console.log("Array Method Error Pool Used", pool.numUsed());
  console.log("Array Method Error Pool Free on on response", pool.numFree());
});

const joinCombatantsArmiesUsers = async (id) => {
  const array = await knex("combatants")
    .join("armies", "combatants.army_id", "=", "armies.id")
    .join("users", "armies.user_id", "=", "users.id")
    .join("rank", "combatants.army_id", "")
    .where({ "combatants.id": id })
    .orWhere({ "combatants.team_id": id });

  return array;
};

const getUsersCompleteBattleArray = async (id) => {
  try {
    const battleArray = await knex("battles")
      .innerJoin("combatants", (builder) => {
        builder
          .on("battles.player_1_id", "=", "combatants.id")
          .orOn("battles.player_2_id", "=", "combatants.id");
      })
      .join("armies", "combatants.army_id", "=", "armies.id")
      .join("users", "armies.user_id", "=", "users.id")
      .where("users.id", "=", id)
      .andWhere({ status: "submitted" });
    return battleArray;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const battleFormattingVerionOne = async (array) => {
  try {
    const subquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .select("army_id", "date", "ranking")
      .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
      .as("ranks");

    const promiseBattleArray = array.map(async (battle) => {
      let newDate = dayjs(battle.date).format("YYYY-MM-DD");
      let playerOneObj = await knex("combatants")
        .where({ "combatants.id": battle.player_1_id })
        .orWhere({ "combatants.team_id": battle.player_1_id })
        .join("armies", "combatants.army_id", "=", "armies.id")
        .join("users", "armies.user_id", "=", "users.id")
        .select("armies.name", "users.known_as", "armies.id", "armies.user_id");

      let playerTwoObj = await knex("combatants")
        .where({ "combatants.id": battle.player_2_id })
        .orWhere({ "combatants.team_id": battle.player_2_id })
        .join("armies", "combatants.army_id", "=", "armies.id")
        .join("users", "armies.user_id", "=", "users.id")
        .select("armies.name", "users.known_as", "armies.id", "armies.user_id");

      const playerOneArray = playerOneObj.map(async (player) => {
        let playerRankQuery = knex(subquery)
          .as("ranking_two")
          .where("rn", 1)
          .andWhere("army_id", player.id)
          .pluck("ranking");

        let playerRank = await Promise.resolve(playerRankQuery);

        return {
          id: player.user_id,
          army_id: player.id,
          name: player.name,
          known_as: player.known_as,
          rank: playerRank[0],
        };
      });

      const playerTwoArray = playerTwoObj.map(async (player) => {
        let playerRankQuery = knex(subquery)
          .as("ranking_two")
          .where("rn", 1)
          .andWhere("army_id", player.id)
          .pluck("ranking");

        let playerRank = await Promise.resolve(playerRankQuery);

        return {
          id: player.user_id,
          army_id: player.id,
          name: player.name,
          known_as: player.known_as,
          rank: playerRank[0],
        };
      });

      const resolvedPlayerOne = await Promise.all(playerOneArray);
      const resolvedPlayerTwo = await Promise.all(playerTwoArray);

      let newBattleObj = {
        id: battle.id,
        date: newDate,
        start: battle.start,
        finish: battle.finish,
        table: battle.table,
        scenario: battle.scenario,
        points_size: battle.points_size,
        player_1_points: battle.player_1_points,
        player_2_points: battle.player_2_points,
        result: battle.result,
        winner: battle.winner,
        battle_type: battle.battle_type,
        player_type: battle.player_type,
        combatant_1_id: battle.player_1_id,
        combatant_2_id: battle.player_2_id,
        player_1: resolvedPlayerOne,
        player_2: resolvedPlayerTwo,
      };

      return newBattleObj;
    });

    const formattedBattleArray = await Promise.all(promiseBattleArray);

    const sortedBattleArray = formattedBattleArray.sort(
      (a, b) => Date.parse(a.date) - Date.parse(b.date)
    );
    return sortedBattleArray;
  } catch (error) {
    console.error(error);
    const formattedBattleArray = {
      errorMessage: "Error formatting the battle array",
    };
    return formattedBattleArray;
  }
};

const completedBattleFormattingLimited = async () => {
  try {
    const battleArray = await knex("battles")
      .where({ status: "submitted" })
      .join("combatants AS cb1", function () {
        this.on("battles.player_1_id", "=", "cb1.id").orOn(
          "battles.player_1_id",
          "=",
          "cb1.team_id"
        );
      })
      .join("combatants AS cb2", function () {
        this.on("battles.player_2_id", "=", "cb2.id").orOn(
          "battles.player_2_id",
          "=",
          "cb2.team_id"
        );
      })
      .join("armies AS a1", "cb1.army_id", "a1.id")
      .join("armies AS a2", "cb2.army_id", "a2.id")
      .join("users as u1", "a1.user_id", "=", "u1.id")
      .join("users as u2", "a2.user_id", "=", "u2.id")
      .select(
        "battles.*",
        "a1.type AS a1_type",
        "a1.emblem AS a1_emblem",
        "a1.name AS a1_name",
        "a2.type AS a2_type",
        "a2.emblem AS a2_emblem",
        "a1.user_id AS a1_userid",
        "a2.user_id AS a2_userid",
        "a2.name AS a2_name",
        "cb1.id AS cb1_id",
        "cb2.id AS cb2_id",
        "cb1.army_id AS cb1_armyid",
        "cb2.army_id AS cb2_armyid",
        "cb1.team_id AS cb1_teamid",
        "cb2.team_id AS cb2_teamid",
        "u1.known_as AS u1_known_as",
        "u2.known_as AS u2_known_as"
      )
      .orderBy("date", "desc");

    const rankArray = await knex("rank_view").where("rn", 1);

    const singleBattleArray = battleArray.filter(
      (battle) => battle.player_type === "single"
    );
    const multiBattleArray = battleArray.filter(
      (battle) => battle.player_type === "multi"
    );

    const mappedSingle = singleBattleArray.map((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );
      return {
        ...battle,
        playerOne: [
          {
            name: battle.a1_name,
            army_id: battle.cb1_armyid,
            id: battle.a1_userid,
            known_as: battle.u1_known_as,
            ranking: playerOneRankScore.ranking,
          },
        ],
        playerTwo: [
          {
            name: battle.a2_name,
            army_id: battle.cb2_armyid,
            id: battle.a2_userid,
            known_as: battle.u2_known_as,
            ranking: playerTwoRankScore.ranking,
          },
        ],
      };
    });

    let mappedArray = [];
    multiBattleArray.forEach((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );

      const targetBattle = mappedArray.find(
        (target) => target.id === battle.id
      );

      if (!targetBattle) {
        mappedArray.push({
          ...battle,
          playerOne: [
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ],
          playerTwo: [
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ],
        });
      } else if (targetBattle) {
        const targetIndex = mappedArray.findIndex(
          (target) => target.id === battle.id
        );
        const playerOneBool = targetBattle.playerOne.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb1_armyid
        );

        const playerTwoBool = targetBattle.playerTwo.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb2_armyid
        );

        if (playerOneBool && playerTwoBool) {
        } else if (playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        }
      }
    });

    const consolidatedArray = [...mappedSingle, ...mappedArray];

    const responseArray = consolidatedArray
      .map((battle, index) => {
        if (index < 5) {
          return {
            id: battle.id,
            date: dayjs(battle.date).format("YYYY-MM-DD"),
            start: battle.start,
            finish: battle.finish,
            table: battle.table,
            scenario: battle.scenario,
            points_size: battle.points_size,
            player_1_points: battle.player_1_points,
            player_2_points: battle.player_2_points,
            result: battle.result,
            winner: battle.winner,
            battle_type: battle.battle_type,
            player_type: battle.player_type,
            combatant_1_id: battle.player_1_id,
            combatant_2_id: battle.player_2_id,
            user_1_id: battle.a1_userid,
            user_2_id: battle.a2_userid,
            player_1: battle.playerOne,
            player_2: battle.playerTwo,
          };
        } else {
          return " ";
        }
      })
      .filter((battle) => battle !== " ");
    return responseArray;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const formatOneBattle = async (id) => {
  try {
    const battleArray = await knex("battles")
      .where({ "battles.id": id })
      .join("combatants AS cb1", function () {
        this.on("battles.player_1_id", "=", "cb1.id").orOn(
          "battles.player_1_id",
          "=",
          "cb1.team_id"
        );
      })
      .join("combatants AS cb2", function () {
        this.on("battles.player_2_id", "=", "cb2.id").orOn(
          "battles.player_2_id",
          "=",
          "cb2.team_id"
        );
      })
      .join("armies AS a1", "cb1.army_id", "a1.id")
      .join("armies AS a2", "cb2.army_id", "a2.id")
      .join("users as u1", "a1.user_id", "=", "u1.id")
      .join("users as u2", "a2.user_id", "=", "u2.id")
      .select(
        "battles.*",
        "a1.type AS a1_type",
        "a1.emblem AS a1_emblem",
        "a1.name AS a1_name",
        "a2.type AS a2_type",
        "a2.emblem AS a2_emblem",
        "a1.user_id AS a1_userid",
        "a2.user_id AS a2_userid",
        "a2.name AS a2_name",
        "cb1.id AS cb1_id",
        "cb2.id AS cb2_id",
        "cb1.army_id AS cb1_armyid",
        "cb2.army_id AS cb2_armyid",
        "cb1.team_id AS cb1_teamid",
        "cb2.team_id AS cb2_teamid",
        "u1.known_as AS u1_known_as",
        "u2.known_as AS u2_known_as"
      );
    const rankArray = await knex("rank_view").where("rn", 1);

    const singleBattleArray = battleArray.filter(
      (battle) => battle.player_type === "single"
    );
    const multiBattleArray = battleArray.filter(
      (battle) => battle.player_type === "multi"
    );

    const mappedSingle = singleBattleArray.map((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      console.log(playerOneRankScore);
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );
      return {
        ...battle,
        playerOne: [
          {
            name: battle.a1_name,
            army_id: battle.cb1_armyid,
            id: battle.a1_userid,
            known_as: battle.u1_known_as,
            ranking: playerOneRankScore.ranking,
          },
        ],
        playerTwo: [
          {
            name: battle.a2_name,
            army_id: battle.cb2_armyid,
            id: battle.a2_userid,
            known_as: battle.u2_known_as,
            ranking: playerTwoRankScore.ranking,
          },
        ],
      };
    });

    let mappedArray = [];
    multiBattleArray.forEach((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );

      const targetBattle = mappedArray.find(
        (target) => target.id === battle.id
      );

      if (!targetBattle) {
        mappedArray.push({
          ...battle,
          playerOne: [
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ],
          playerTwo: [
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ],
        });
      } else if (targetBattle) {
        const targetIndex = mappedArray.findIndex(
          (target) => target.id === battle.id
        );
        const playerOneBool = targetBattle.playerOne.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb1_armyid
        );

        const playerTwoBool = targetBattle.playerTwo.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb2_armyid
        );

        if (playerOneBool && playerTwoBool) {
        } else if (playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        }
      }
    });

    const consolidatedArray = [...mappedSingle, ...mappedArray];

    const responseArray = consolidatedArray
      .map((battle, index) => {
        if (index < 5) {
          return {
            id: battle.id,
            date: dayjs(battle.date).format("YYYY-MM-DD"),
            start: battle.start,
            finish: battle.finish,
            table: battle.table,
            scenario: battle.scenario,
            points_size: battle.points_size,
            player_1_points: battle.player_1_points,
            player_2_points: battle.player_2_points,
            result: battle.result,
            winner: battle.winner,
            battle_type: battle.battle_type,
            player_type: battle.player_type,
            combatant_1_id: battle.player_1_id,
            combatant_2_id: battle.player_2_id,
            user_1_id: battle.a1_userid,
            user_2_id: battle.a2_userid,
            player_1: battle.playerOne,
            player_2: battle.playerTwo,
          };
        } else {
          return " ";
        }
      })
      .filter((battle) => battle !== " ");
    return responseArray;
  } catch (error) {
    console.error(error);
    return error;
  }
};
const completedBattleFormatting = async () => {
  try {
    const battleArray = await knex("battles")
      .where({ status: "submitted" })
      .join("combatants AS cb1", function () {
        this.on("battles.player_1_id", "=", "cb1.id").orOn(
          "battles.player_1_id",
          "=",
          "cb1.team_id"
        );
      })
      .join("combatants AS cb2", function () {
        this.on("battles.player_2_id", "=", "cb2.id").orOn(
          "battles.player_2_id",
          "=",
          "cb2.team_id"
        );
      })
      .join("armies AS a1", "cb1.army_id", "a1.id")
      .join("armies AS a2", "cb2.army_id", "a2.id")
      .join("users as u1", "a1.user_id", "=", "u1.id")
      .join("users as u2", "a2.user_id", "=", "u2.id")
      .select(
        "battles.*",
        "a1.type AS a1_type",
        "a1.emblem AS a1_emblem",
        "a1.name AS a1_name",
        "a2.type AS a2_type",
        "a2.emblem AS a2_emblem",
        "a1.user_id AS a1_userid",
        "a2.user_id AS a2_userid",
        "a2.name AS a2_name",
        "cb1.id AS cb1_id",
        "cb2.id AS cb2_id",
        "cb1.army_id AS cb1_armyid",
        "cb2.army_id AS cb2_armyid",
        "cb1.team_id AS cb1_teamid",
        "cb2.team_id AS cb2_teamid",
        "u1.known_as AS u1_known_as",
        "u2.known_as AS u2_known_as"
      )
      .orderBy("date", "desc");

    const rankArray = await knex("rank_view").where("rn", 1);

    const singleBattleArray = battleArray.filter(
      (battle) => battle.player_type === "single"
    );
    const multiBattleArray = battleArray.filter(
      (battle) => battle.player_type === "multi"
    );

    const mappedSingle = singleBattleArray.map((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );
      return {
        ...battle,
        playerOne: [
          {
            name: battle.a1_name,
            army_id: battle.cb1_armyid,
            id: battle.a1_userid,
            known_as: battle.u1_known_as,
            ranking: playerOneRankScore.ranking,
          },
        ],
        playerTwo: [
          {
            name: battle.a2_name,
            army_id: battle.cb2_armyid,
            id: battle.a2_userid,
            known_as: battle.u2_known_as,
            ranking: playerTwoRankScore.ranking,
          },
        ],
      };
    });

    let mappedArray = [];
    multiBattleArray.forEach((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );

      const targetBattle = mappedArray.find(
        (target) => target.id === battle.id
      );

      if (!targetBattle) {
        mappedArray.push({
          ...battle,
          playerOne: [
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ],
          playerTwo: [
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ],
        });
      } else if (targetBattle) {
        const targetIndex = mappedArray.findIndex(
          (target) => target.id === battle.id
        );
        const playerOneBool = targetBattle.playerOne.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb1_armyid
        );

        const playerTwoBool = targetBattle.playerTwo.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb2_armyid
        );

        if (playerOneBool && playerTwoBool) {
        } else if (playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        }
      }
    });

    const consolidatedArray = [...mappedSingle, ...mappedArray];

    const responseArray = consolidatedArray.map((battle) => {
      return {
        id: battle.id,
        date: dayjs(battle.date).format("YYYY-MM-DD"),
        start: battle.start,
        finish: battle.finish,
        table: battle.table,
        scenario: battle.scenario,
        points_size: battle.points_size,
        player_1_points: battle.player_1_points,
        player_2_points: battle.player_2_points,
        result: battle.result,
        winner: battle.winner,
        battle_type: battle.battle_type,
        player_type: battle.player_type,
        combatant_1_id: battle.player_1_id,
        combatant_2_id: battle.player_2_id,
        user_1_id: battle.a1_userid,
        user_2_id: battle.a2_userid,
        player_1: battle.playerOne,
        player_2: battle.playerTwo,
      };
    });
    return responseArray;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const userCompletedBattleFormatting = async (id) => {
  try {
    const battleArray = await knex("battles")
      .where({ status: "submitted" })
      .join("combatants AS cb1", function () {
        this.on("battles.player_1_id", "=", "cb1.id").orOn(
          "battles.player_1_id",
          "=",
          "cb1.team_id"
        );
      })
      .join("combatants AS cb2", function () {
        this.on("battles.player_2_id", "=", "cb2.id").orOn(
          "battles.player_2_id",
          "=",
          "cb2.team_id"
        );
      })
      .join("armies AS a1", "cb1.army_id", "a1.id")
      .join("armies AS a2", "cb2.army_id", "a2.id")
      .join("users as u1", "a1.user_id", "=", "u1.id")
      .join("users as u2", "a2.user_id", "=", "u2.id")
      .andWhere((builder) => {
        builder.where("a1.user_id", "=", id).orWhere("a2.user_id", "=", id);
      })
      .select(
        "battles.*",
        "a1.type AS a1_type",
        "a1.emblem AS a1_emblem",
        "a1.name AS a1_name",
        "a2.type AS a2_type",
        "a2.emblem AS a2_emblem",
        "a1.user_id AS a1_userid",
        "a2.user_id AS a2_userid",
        "a2.name AS a2_name",
        "cb1.id AS cb1_id",
        "cb2.id AS cb2_id",
        "cb1.army_id AS cb1_armyid",
        "cb2.army_id AS cb2_armyid",
        "cb1.team_id AS cb1_teamid",
        "cb2.team_id AS cb2_teamid",
        "u1.known_as AS u1_known_as",
        "u2.known_as AS u2_known_as"
      )
      .orderBy("date", "desc");

    const rankArray = await knex("rank_view").where("rn", 1);

    const singleBattleArray = battleArray.filter(
      (battle) => battle.player_type === "single"
    );
    const multiBattleArray = battleArray.filter(
      (battle) => battle.player_type === "multi"
    );

    const mappedSingle = singleBattleArray.map((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );
      return {
        ...battle,
        playerOne: [
          {
            name: battle.a1_name,
            army_id: battle.cb1_armyid,
            id: battle.a1_userid,
            known_as: battle.u1_known_as,
            ranking: playerOneRankScore.ranking,
          },
        ],
        playerTwo: [
          {
            name: battle.a2_name,
            army_id: battle.cb2_armyid,
            id: battle.a2_userid,
            known_as: battle.u2_known_as,
            ranking: playerTwoRankScore.ranking,
          },
        ],
      };
    });

    let mappedArray = [];
    multiBattleArray.forEach((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );

      const targetBattle = mappedArray.find(
        (target) => target.id === battle.id
      );

      if (!targetBattle) {
        mappedArray.push({
          ...battle,
          playerOne: [
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ],
          playerTwo: [
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ],
        });
      } else if (targetBattle) {
        const targetIndex = mappedArray.findIndex(
          (target) => target.id === battle.id
        );
        const playerOneBool = targetBattle.playerOne.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb1_armyid
        );

        const playerTwoBool = targetBattle.playerTwo.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb2_armyid
        );

        if (playerOneBool && playerTwoBool) {
        } else if (playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        }
      }
    });

    const consolidatedArray = [...mappedSingle, ...mappedArray];

    const responseArray = consolidatedArray.map((battle) => {
      return {
        id: battle.id,
        date: dayjs(battle.date).format("YYYY-MM-DD"),
        start: battle.start,
        finish: battle.finish,
        table: battle.table,
        scenario: battle.scenario,
        points_size: battle.points_size,
        player_1_points: battle.player_1_points,
        player_2_points: battle.player_2_points,
        result: battle.result,
        winner: battle.winner,
        battle_type: battle.battle_type,
        player_type: battle.player_type,
        combatant_1_id: battle.player_1_id,
        combatant_2_id: battle.player_2_id,
        user_1_id: battle.a1_userid,
        user_2_id: battle.a2_userid,
        player_1: battle.playerOne,
        player_2: battle.playerTwo,
      };
    });
    return responseArray;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const upcomingBattleFormattingLimited = async () => {
  try {
    const battleArray = await knex("battles")
      .where({ status: null })
      .join("combatants AS cb1", function () {
        this.on("battles.player_1_id", "=", "cb1.id").orOn(
          "battles.player_1_id",
          "=",
          "cb1.team_id"
        );
      })
      .join("combatants AS cb2", function () {
        this.on("battles.player_2_id", "=", "cb2.id").orOn(
          "battles.player_2_id",
          "=",
          "cb2.team_id"
        );
      })
      .join("armies AS a1", "cb1.army_id", "a1.id")
      .join("armies AS a2", "cb2.army_id", "a2.id")
      .join("users as u1", "a1.user_id", "=", "u1.id")
      .join("users as u2", "a2.user_id", "=", "u2.id")
      .select(
        "battles.*",
        "a1.type AS a1_type",
        "a1.emblem AS a1_emblem",
        "a1.name AS a1_name",
        "a2.type AS a2_type",
        "a2.emblem AS a2_emblem",
        "a1.user_id AS a1_userid",
        "a2.user_id AS a2_userid",
        "a2.name AS a2_name",
        "cb1.id AS cb1_id",
        "cb2.id AS cb2_id",
        "cb1.army_id AS cb1_armyid",
        "cb2.army_id AS cb2_armyid",
        "cb1.team_id AS cb1_teamid",
        "cb2.team_id AS cb2_teamid",
        "u1.known_as AS u1_known_as",
        "u2.known_as AS u2_known_as"
      )
      .orderBy("date", "desc");

    const rankArray = await knex("rank_view").where("rn", 1);

    const singleBattleArray = battleArray.filter(
      (battle) => battle.player_type === "single"
    );
    const multiBattleArray = battleArray.filter(
      (battle) => battle.player_type === "multi"
    );

    const mappedSingle = singleBattleArray.map((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );

      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );
      return {
        ...battle,
        playerOne: [
          {
            name: battle.a1_name,
            army_id: battle.cb1_armyid,
            id: battle.a1_userid,
            known_as: battle.u1_known_as,
            ranking: !playerOneRankScore.ranking
              ? 30
              : playerOneRankScore.ranking,
          },
        ],
        playerTwo: [
          {
            name: battle.a2_name,
            army_id: battle.cb2_armyid,
            id: battle.a2_userid,
            known_as: battle.u2_known_as,
            ranking: !playerTwoRankScore.ranking
              ? 30
              : playerTwoRankScore.ranking,
          },
        ],
      };
    });

    let mappedArray = [];
    multiBattleArray.forEach((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );

      const targetBattle = mappedArray.find(
        (target) => target.id === battle.id
      );

      if (!targetBattle) {
        mappedArray.push({
          ...battle,
          playerOne: [
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ],
          playerTwo: [
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ],
        });
      } else if (targetBattle) {
        const targetIndex = mappedArray.findIndex(
          (target) => target.id === battle.id
        );
        const playerOneBool = targetBattle.playerOne.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb1_armyid
        );

        const playerTwoBool = targetBattle.playerTwo.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb2_armyid
        );

        if (playerOneBool && playerTwoBool) {
        } else if (playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        }
      }
    });

    const consolidatedArray = [...mappedSingle, ...mappedArray];

    const responseArray = consolidatedArray
      .map((battle, index) => {
        if (index < 5) {
          return {
            id: battle.id,
            date: dayjs(battle.date).format("YYYY-MM-DD"),
            start: battle.start,
            finish: battle.finish,
            table: battle.table,
            scenario: battle.scenario,
            points_size: battle.points_size,
            player_1_points: battle.player_1_points,
            player_2_points: battle.player_2_points,
            result: battle.result,
            winner: battle.winner,
            battle_type: battle.battle_type,
            player_type: battle.player_type,
            combatant_1_id: battle.player_1_id,
            combatant_2_id: battle.player_2_id,
            user_1_id: battle.a1_userid,
            user_2_id: battle.a2_userid,
            player_1: battle.playerOne,
            player_2: battle.playerTwo,
          };
        } else {
          return " ";
        }
      })
      .filter((battle) => battle !== " ");
    return responseArray;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const upcomingBattleFormatting = async () => {
  try {
    const battleArray = await knex("battles")
      .where({ status: null })
      .join("combatants AS cb1", function () {
        this.on("battles.player_1_id", "=", "cb1.id").orOn(
          "battles.player_1_id",
          "=",
          "cb1.team_id"
        );
      })
      .join("combatants AS cb2", function () {
        this.on("battles.player_2_id", "=", "cb2.id").orOn(
          "battles.player_2_id",
          "=",
          "cb2.team_id"
        );
      })
      .join("armies AS a1", "cb1.army_id", "a1.id")
      .join("armies AS a2", "cb2.army_id", "a2.id")
      .join("users as u1", "a1.user_id", "=", "u1.id")
      .join("users as u2", "a2.user_id", "=", "u2.id")
      .select(
        "battles.*",
        "a1.type AS a1_type",
        "a1.emblem AS a1_emblem",
        "a1.name AS a1_name",
        "a2.type AS a2_type",
        "a2.emblem AS a2_emblem",
        "a1.user_id AS a1_userid",
        "a2.user_id AS a2_userid",
        "a2.name AS a2_name",
        "cb1.id AS cb1_id",
        "cb2.id AS cb2_id",
        "cb1.army_id AS cb1_armyid",
        "cb2.army_id AS cb2_armyid",
        "cb1.team_id AS cb1_teamid",
        "cb2.team_id AS cb2_teamid",
        "u1.known_as AS u1_known_as",
        "u2.known_as AS u2_known_as"
      )
      .orderBy("date", "desc");

    const rankArray = await knex("rank_view").where("rn", 1);

    const singleBattleArray = battleArray.filter(
      (battle) => battle.player_type === "single"
    );
    const multiBattleArray = battleArray.filter(
      (battle) => battle.player_type === "multi"
    );

    const mappedSingle = singleBattleArray.map((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );
      return {
        ...battle,
        playerOne: [
          {
            name: battle.a1_name,
            army_id: battle.cb1_armyid,
            id: battle.a1_userid,
            known_as: battle.u1_known_as,
            ranking: playerOneRankScore.ranking,
          },
        ],
        playerTwo: [
          {
            name: battle.a2_name,
            army_id: battle.cb2_armyid,
            id: battle.a2_userid,
            known_as: battle.u2_known_as,
            ranking: playerTwoRankScore.ranking,
          },
        ],
      };
    });

    let mappedArray = [];
    multiBattleArray.forEach((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );

      const targetBattle = mappedArray.find(
        (target) => target.id === battle.id
      );

      if (!targetBattle) {
        mappedArray.push({
          ...battle,
          playerOne: [
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ],
          playerTwo: [
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ],
        });
      } else if (targetBattle) {
        const targetIndex = mappedArray.findIndex(
          (target) => target.id === battle.id
        );
        const playerOneBool = targetBattle.playerOne.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb1_armyid
        );

        const playerTwoBool = targetBattle.playerTwo.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb2_armyid
        );

        if (playerOneBool && playerTwoBool) {
        } else if (playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        }
      }
    });

    const consolidatedArray = [...mappedSingle, ...mappedArray];

    const responseArray = consolidatedArray.map((battle) => {
      return {
        id: battle.id,
        date: dayjs(battle.date).format("YYYY-MM-DD"),
        start: battle.start,
        finish: battle.finish,
        table: battle.table,
        scenario: battle.scenario,
        points_size: battle.points_size,
        player_1_points: battle.player_1_points,
        player_2_points: battle.player_2_points,
        result: battle.result,
        winner: battle.winner,
        battle_type: battle.battle_type,
        player_type: battle.player_type,
        combatant_1_id: battle.player_1_id,
        combatant_2_id: battle.player_2_id,
        user_1_id: battle.a1_userid,
        user_2_id: battle.a2_userid,
        player_1: battle.playerOne,
        player_2: battle.playerTwo,
      };
    });
    return responseArray;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const completedArmiesBattleFormatting = async () => {
  try {
    const battleArray = await knex("battles")
      .join("combatants AS cb1", function () {
        this.on("battles.player_1_id", "=", "cb1.id").orOn(
          "battles.player_1_id",
          "=",
          "cb1.team_id"
        );
      })
      .join("combatants AS cb2", function () {
        this.on("battles.player_2_id", "=", "cb2.id").orOn(
          "battles.player_2_id",
          "=",
          "cb2.team_id"
        );
      })
      .join("armies AS a1", "cb1.army_id", "a1.id")
      .join("armies AS a2", "cb2.army_id", "a2.id")
      .join("users as u1", "a1.user_id", "=", "u1.id")
      .join("users as u2", "a2.user_id", "=", "u2.id")
      .andWhere("battles.status", "=", "submitted")
      .select(
        "battles.*",
        "a1.type AS a1_type",
        "a1.emblem AS a1_emblem",
        "a1.name AS a1_name",
        "a2.type AS a2_type",
        "a2.emblem AS a2_emblem",
        "a1.user_id AS a1_userid",
        "a2.user_id AS a2_userid",
        "a2.name AS a2_name",
        "cb1.id AS cb1_id",
        "cb2.id AS cb2_id",
        "cb1.army_id AS cb1_armyid",
        "cb2.army_id AS cb2_armyid",
        "cb1.team_id AS cb1_teamid",
        "cb2.team_id AS cb2_teamid",
        "u1.known_as AS u1_known_as",
        "u2.known_as AS u2_known_as"
      )
      .orderBy("date", "desc");

    const rankArray = await knex("rank_view").where("rn", 1);

    const singleBattleArray = battleArray.filter(
      (battle) => battle.player_type === "single"
    );
    const multiBattleArray = battleArray.filter(
      (battle) => battle.player_type === "multi"
    );

    const mappedSingle = singleBattleArray.map((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );
      return {
        ...battle,
        playerOne: [
          {
            name: battle.a1_name,
            army_id: battle.cb1_armyid,
            id: battle.a1_userid,
            known_as: battle.u1_known_as,
            ranking: playerOneRankScore.ranking,
          },
        ],
        playerTwo: [
          {
            name: battle.a2_name,
            army_id: battle.cb2_armyid,
            id: battle.a2_userid,
            known_as: battle.u2_known_as,
            ranking: playerTwoRankScore.ranking,
          },
        ],
      };
    });

    let mappedArray = [];
    multiBattleArray.forEach((battle) => {
      const playerOneRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb1_armyid
      );
      const playerTwoRankScore = rankArray.find(
        (rank) => rank.army_id === battle.cb2_armyid
      );

      const targetBattle = mappedArray.find(
        (target) => target.id === battle.id
      );

      if (!targetBattle) {
        mappedArray.push({
          ...battle,
          playerOne: [
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ],
          playerTwo: [
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ],
        });
      } else if (targetBattle) {
        const targetIndex = mappedArray.findIndex(
          (target) => target.id === battle.id
        );
        const playerOneBool = targetBattle.playerOne.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb1_armyid
        );

        const playerTwoBool = targetBattle.playerTwo.find(
          (targetPlayer) => targetPlayer.army_id === battle.cb2_armyid
        );

        if (playerOneBool && playerTwoBool) {
        } else if (playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
        } else if (!playerOneBool && !playerTwoBool) {
          mappedArray[targetIndex].playerOne = [
            ...mappedArray[targetIndex].playerOne,
            {
              name: battle.a1_name,
              army_id: battle.cb1_armyid,
              id: battle.a1_userid,
              known_as: battle.u1_known_as,
              ranking: playerOneRankScore.ranking,
            },
          ];
          mappedArray[targetIndex].playerTwo = [
            ...mappedArray[targetIndex].playerTwo,
            {
              name: battle.a2_name,
              army_id: battle.cb2_armyid,
              id: battle.a2_userid,
              known_as: battle.u2_known_as,
              ranking: playerTwoRankScore.ranking,
            },
          ];
        }
      }
    });

    const consolidatedArray = [...mappedSingle, ...mappedArray];

    const responseArray = consolidatedArray.map((battle) => {
      return {
        id: battle.id,
        date: dayjs(battle.date).format("YYYY-MM-DD"),
        start: battle.start,
        finish: battle.finish,
        table: battle.table,
        scenario: battle.scenario,
        points_size: battle.points_size,
        player_1_points: battle.player_1_points,
        player_2_points: battle.player_2_points,
        result: battle.result,
        winner: battle.winner,
        battle_type: battle.battle_type,
        player_type: battle.player_type,
        combatant_1_id: battle.player_1_id,
        combatant_2_id: battle.player_2_id,
        user_1_id: battle.a1_userid,
        user_2_id: battle.a2_userid,
        player_1: battle.playerOne,
        player_2: battle.playerTwo,
      };
    });
    return responseArray;
  } catch (error) {
    console.error(error);
    return error;
  }
};

const singleBattlePlayerFormatting = async (battle) => {
  const playerOneID = battle.player_1_id;
  const playerTwoID = battle.player_2_id;

  const playerOneArray = await joinCombatantsArmiesUsers(playerOneID);
  const playerTwoArray = await joinCombatantsArmiesUsers(playerTwoID);

  const newBattleObj = {
    ...battle,
    playerOne: playerOneArray,
    playerTwo: playerTwoArray,
  };

  return newBattleObj;
};
module.exports = {
  singleBattlePlayerFormatting,
  completedBattleFormattingLimited,
  completedBattleFormatting,
  upcomingBattleFormattingLimited,
  upcomingBattleFormatting,
  formatOneBattle,
  completedArmiesBattleFormatting,
  getUsersCompleteBattleArray,
  userCompletedBattleFormatting,
};
