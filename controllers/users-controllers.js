const database = require("../database/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  completedBattleFormatting,
  userCompletedBattleFormatting,
} = require("../utils/ArrayMethods");
const { verifyToken, getTokenProfile } = require("../utils/Auth");
const { armyCountFn } = require("./armies-controller");

const pool = database.client.pool;

database.on("query", (builder) => {
  console.log("User Controller to be executed", builder.sql);
  console.log("User Controller Pool Used on Start", pool.numUsed());
  console.log("User Controller Pool Used on Start", pool.numPendingAcquires());

  console.log("User Controller Pool Free on Start", pool.numFree());
});

database.on("query-response", (response, builder) => {
  console.log("User Controller Query executed successfully:", builder.sql);
  console.log("User Controller Pool Used on response", pool.numUsed());
  console.log("User Controller Pool Free on response", pool.numFree());
});

database.on("query-error", (error, builder) => {
  console.error("Error executing query:", builder.sql, error);
  console.log("User Controller Error Pool Used on error", pool.numUsed());
  console.log("User Controller Error Pool Free on error", pool.numFree());
});

const getAllUsers = async (req, res) => {
  try {
    const userArray = await database("users").select(
      "known_as",
      "first_name",
      "last_name",
      "email",
      "role",
      "id"
    );

    res.status(200).send(userArray);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to access Users");
  }
};

const getOneUser = async (req, res) => {
  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = verifyToken(authToken);

    if (decodedToken === null) {
      return res.status(400).send(null);
    }

    const profile = await database("users")
      .where({ id: decodedToken.id })
      .first();

    delete profile.password;

    res.status(200).send(profile);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

const getOneOtherUser = async (req, res) => {
  const userID = req.params.id;
  try {
    const profile = await database("users").where({ id: userID }).first();

    res.status(200).send(profile);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

const getUserNemesis = async (req, res) => {
  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = jwt.verify(authToken, process.env.JWT_KEY);
    if (!decodedToken) {
      return res
        .status(400)
        .send("Please log in again, your session has expired");
    }

    const profile = await getTokenProfile(decodedToken.id);

    if (!profile) {
      return res.status(400).send("Issue retrieving the users profile");
    }

    delete profile.password;

    const formattedBattleArray = await completedBattleFormatting();

    const filterArray = formattedBattleArray.filter((battle) => {
      const playerOneBool = battle.player_1.find(
        (player) => player.id === decodedToken.id
      );
      const playerTwoBool = battle.player_2.find(
        (player) => player.id === decodedToken.id
      );
      if (playerOneBool || playerTwoBool) {
        return true;
      } else {
        return false;
      }
    });

    let opponentArray = [];

    let playerOneArray = await filterArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = await filterArray.map((battle) => {
      return battle.player_2;
    });

    playerOneArray.map((player, index) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].id === profile.id) {
          playerBool = true;
        }
      }
      if (playerBool === false) {
        opponentArray.push(player);
        false;
      }
    });

    playerTwoArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].id === profile.id) {
          playerBool = true;
        }
      }
      if (playerBool === false) {
        opponentArray.push(player);
        false;
      }
    });

    const flatOpponentArray = opponentArray.flat(1);

    let armyArray = [];

    flatOpponentArray.forEach((army) => {
      let armyBool = false;
      for (let i = 0; i < armyArray.length; i++) {
        if (
          armyArray[i].id === army.id &&
          armyArray[i].name === army.name &&
          armyArray[i].known_as === army.known_as
        ) {
          armyBool = true;
          armyArray[i].count++;
        }
      }
      if (armyBool !== true) {
        armyArray.push({ count: 1, ...army });
      }
    });

    const sortedOpponentArray = armyArray.sort((a, b) => b.count - a.count);

    res.status(200).send(sortedOpponentArray[0]);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

const getUserAlly = async (req, res) => {
  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = verifyToken(authToken);

    const profile = await getTokenProfile(decodedToken.id);

    if (!profile) {
      return res.status(400).send("Issue retrieving the users profile");
    }

    delete profile.password;

    const formattedBattleArray = await completedBattleFormatting();
    if (!formattedBattleArray) {
      return res.status(400).send("Issue formatting the battle array");
    }

    const filterArray = formattedBattleArray.filter((battle) => {
      const playerOneBool = battle.player_1.find(
        (player) => player.id === decodedToken.id
      );
      const playerTwoBool = battle.player_2.find(
        (player) => player.id === decodedToken.id
      );
      if (playerOneBool || playerTwoBool) {
        return true;
      } else {
        return false;
      }
    });

    let opponentArray = [];

    let playerOneArray = filterArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = filterArray.map((battle) => {
      return battle.player_2;
    });

    playerOneArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].id === profile.id) {
          playerBool = true;
        }
      }
      if (playerBool === true) {
        opponentArray.push(player);
        playerBool = false;
      }
    });

    playerTwoArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].id === profile.id) {
          playerBool = true;
        }
      }
      if (playerBool === true) {
        opponentArray.push(player);
        playerBool = false;
      }
    });

    const flatOpponentArray = opponentArray.flat(1);

    let armyArray = [];

    flatOpponentArray.forEach((army) => {
      let armyBool = false;
      for (let i = 0; i < armyArray.length; i++) {
        if (
          armyArray[i].id === army.id &&
          armyArray[i].name === army.name &&
          armyArray[i].known_as === army.known_as
        ) {
          armyBool = true;
          armyArray[i].count++;
        }
      }
      if (armyBool !== true) {
        armyArray.push({ count: 1, ...army });
      }
    });

    const filteredArmyArray = armyArray.filter(
      (player) => player.id !== profile.id
    );

    const sortedOpponentArray = filteredArmyArray.sort(
      (a, b) => b.count - a.count
    );

    res.status(200).send(sortedOpponentArray[0]);
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

const getUserInfo = async (req, res) => {
  const authToken = req.headers.authorization.split(" ")[1];

  try {
    const decodedToken = verifyToken(authToken);

    const profile = await getTokenProfile(decodedToken.id);

    if (!profile) {
      return res.status(400).send("Issue retrieving the users profile");
    }

    delete profile.password;

    const formattedBattleObj = await userCompletedBattleFormatting(
      decodedToken.id
    );

    const formattedBattleArray = formattedBattleObj.responseArray;
    const rankArray = formattedBattleObj.newRankArray;

    if (!formattedBattleArray) {
      return res.status(400).send("Issue formatting the battle array");
    }

    const filterArray = formattedBattleArray.filter((battle) => {
      const playerOneBool = battle.player_1.find(
        (player) => player.id === decodedToken.id
      );
      const playerTwoBool = battle.player_2.find(
        (player) => player.id === decodedToken.id
      );
      if (playerOneBool || playerTwoBool) {
        return true;
      } else {
        return false;
      }
    });

    let opponentArray = [];
    let friendArray = [];

    let playerOneArray = filterArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = filterArray.map((battle) => {
      return battle.player_2;
    });

    playerOneArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].id === profile.id) {
          playerBool = true;
        }
      }
      if (playerBool === true) {
        friendArray.push(player);
        playerBool = false;
      } else {
        opponentArray.push(player);
      }
    });

    playerTwoArray.map((player) => {
      let playerBool = false;
      for (let i = 0; i < player.length; i++) {
        if (player[i].id === profile.id) {
          playerBool = true;
        }
      }
      if (playerBool === true) {
        friendArray.push(player);
        playerBool = false;
      } else {
        opponentArray.push(player);
      }
    });

    const flatOpponentArray = opponentArray.flat(1);
    const flatAllyArray = friendArray.flat(1);

    let nemesisArray = armyCountFn(flatOpponentArray);
    let allyArray = armyCountFn(flatAllyArray);

    const filteredAllyArray = allyArray
      .filter((player) => player.id !== profile.id)
      .sort((a, b) => b.count - a.count);

    const sortedNemesisArray = nemesisArray.sort((a, b) => b.count - a.count);

    res.status(200).send({
      user: profile,
      ally: filteredAllyArray[0],
      nemesis: sortedNemesisArray[0],
      userResults: filterArray,
      rankArray,
    });
  } catch (error) {
    console.error(error);
    res.status(400).send("Unable to retrieve user");
  }
};

module.exports = {
  getAllUsers,
  getOneUser,
  getUserNemesis,
  getUserAlly,
  getOneOtherUser,
  getUserInfo,
};
