const knex = require("knex")(require("../knexfile"));
const dayjs = require("dayjs");

const battleFormatting = async (array) => {
  try {
    const subquery = knex("rank")
      .join("armies", "rank.army_id", "=", "armies.id")
      .select("army_id", "date", "ranking")
      .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
      .as("ranks");

    console.log(array);

    const promiseBattleArray = array.map(async (battle) => {
      let newDate = dayjs(battle.date).format("YYYY-MM-DD");
      let playerOneObj = await knex("combatants")
        .where({ "combatants.id": battle.player_1_id })
        .orWhere({ "combatants.team_id": battle.player_1_id })
        .join("armies", "combatants.army_id", "=", "armies.id")
        .join("users", "armies.user_id", "=", "users.id")
        .select("armies.name", "users.known_as", "armies.id");
      console.log(playerOneObj);

      let playerTwoObj = await knex("combatants")
        .where({ "combatants.id": battle.player_2_id })
        .orWhere({ "combatants.team_id": battle.player_2_id })
        .join("armies", "combatants.army_id", "=", "armies.id")
        .join("users", "armies.user_id", "=", "users.id")
        .select("armies.name", "users.known_as", "armies.id");
      console.log(playerTwoObj);

      const playerOneArray = playerOneObj.map(async (player) => {
        let playerRankQuery = knex(subquery)
          .as("ranking_two")
          .where("rn", 1)
          .andWhere("army_id", player.id)
          .pluck("ranking");
        let playerRank = await Promise.resolve(playerRankQuery);

        return {
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
        battle_type: battle.battle_type,
        player_type: battle.player_type,
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

const CompletedBattleFormatting = async (array) => {
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
        .join("armies", "combatants.army_id", "=", "armies.id")
        .join("users", "armies.user_id", "=", "users.id")
        .select("armies.name", "users.known_as", "armies.id");
      let playerTwoObj = await knex("combatants")
        .where({ "combatants.id": battle.player_2_id })
        .join("armies", "combatants.army_id", "=", "armies.id")
        .join("users", "armies.user_id", "=", "users.id")
        .select("armies.name", "users.known_as", "armies.id");

      const playerOneArray = playerOneObj.map(async (player) => {
        let playerRankQuery = knex(subquery)
          .as("ranking_two")
          .where("rn", 1)
          .andWhere("army_id", player.id)
          .pluck("ranking");
        let playerRank = await Promise.resolve(playerRankQuery);

        return {
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
        battle_type: battle.battle_type,
        player_type: battle.player_type,
        player_1: resolvedPlayerOne,
        player_2: resolvedPlayerTwo,
      };

      return newBattleObj;
    });

    const formattedBattleArray = await Promise.all(promiseBattleArray);

    const sortedBattleArray = formattedBattleArray.sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date)
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

module.exports = { battleFormatting, CompletedBattleFormatting };
