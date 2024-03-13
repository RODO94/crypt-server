const knex = require("knex")(require("../knexfile"));
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {
  CompletedBattleFormatting,
  getUsersCompleteBattleArray,
  completedBattleFormatting,
} = require("../utils/ArrayMethods");
const { verifyToken, getTokenProfile } = require("../utils/Auth");

const getAllUsers = async (req, res) => {
  try {
    const userArray = await knex("users").select(
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

    const profile = await knex("users").where({ id: decodedToken.id }).first();

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
    const profile = await knex("users").where({ id: userID }).first();

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

    const battleArray = await getUsersCompleteBattleArray(profile.id);

    if (!battleArray) {
      return res
        .status(400)
        .send("Issue requesting the array of battles from the database");
    }

    const formattedBattleArray = await completedBattleFormatting(battleArray);
    let opponentArray = [];

    let playerOneArray = await formattedBattleArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = await formattedBattleArray.map((battle) => {
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

    console.log(formattedBattleArray);

    let opponentArray = [];

    let playerOneArray = formattedBattleArray.map((battle) => {
      return battle.player_1;
    });

    let playerTwoArray = formattedBattleArray.map((battle) => {
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

module.exports = {
  getAllUsers,
  getOneUser,
  getUserNemesis,
  getUserAlly,
  getOneOtherUser,
};
