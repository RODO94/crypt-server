/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("armies").del();
  await knex("armies").insert([
    { id: "1", name: "Necrons", emblem: "Necrons", type: "40k", user_id: "2" },
    {
      id: "2",
      name: "Space Wolves",
      emblem: "Space Wolves",
      type: "40k",
      user_id: "2",
    },
    {
      id: "3",
      name: "Blood Angels",
      emblem: "Blood Angels",
      type: "40k",
      user_id: "1",
    },
    {
      id: "4",
      name: "Lizardmen",
      emblem: "Lizardmen",
      type: "fantasy",
      user_id: "1",
    },
    {
      id: "5",
      name: "Adeptus Mechanicus",
      emblem: "Adeptus Mechanicus",
      type: "40k",
      user_id: "4",
    },
    {
      id: "6",
      name: "Death Watch",
      emblem: "Death Watch",
      type: "40k",
      user_id: "1",
    },
    { id: "7", name: "T'au", emblem: "T'au", type: "40k", user_id: "3" },
    {
      id: "8",
      name: "Empire",
      emblem: "Empire",
      type: "fantasy",
      user_id: "3",
    },
    {
      id: "9",
      name: "Beastmen",
      emblem: "Beastmen",
      type: "fantasy",
      user_id: "4",
    },
    {
      id: "10",
      name: "High Elves",
      emblem: "High Elves",
      type: "fantasy",
      user_id: "2",
    },
    {
      id: "11",
      name: "Tzeentch Daemons",
      emblem: "Tzeentch Daemons",
      type: "fantasy",
      user_id: "3",
    },
    {
      id: "12",
      name: "Warriors of Chaos",
      emblem: "Warriors of Chaos",
      type: "fantasy",
      user_id: "8",
    },
    {
      id: "13",
      name: "Savage Orcs",
      emblem: "Savage Orcs",
      type: "fantasy",
      user_id: "6",
    },
    {
      id: "14",
      name: "Aelderi",
      emblem: "Aelderi",
      type: "40k",
      user_id: "5",
    },
    {
      id: "15",
      name: "Orks",
      emblem: "Orks",
      type: "40k",
      user_id: "6",
    },
    { id: "16", name: "Necrons", emblem: "Necrons", type: "40k", user_id: "7" },
    {
      id: "17",
      name: "Chaos Space Marines",
      emblem: "Chaos Space Marines",
      type: "40k",
      user_id: "8",
    },
  ]);
};
