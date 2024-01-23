/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("users").del();
  await knex("users").insert([
    {
      id: "1",
      first_name: "Kieran",
      last_name: "Doak",
      email: "kido@email.com",
      password: "password",
      known_as: "Kieran",
      role: "admin",
    },
    {
      id: "2",
      first_name: "Kato",
      last_name: "Blockley",
      email: "KaB@email.com",
      password: "wordpass",
      known_as: "Kato",
      role: "admin",
    },
    {
      id: "3",
      first_name: "Calum",
      last_name: "Joho",
      email: "Joho69@email.com",
      password: "password",
      known_as: "Cally",
      role: "user",
    },
    {
      id: "4",
      first_name: "Rory",
      last_name: "Doak",
      email: "rodo@email.com",
      password: "wordpass",
      known_as: "Rory",
      role: "admin",
    },
    {
      id: "5",
      first_name: "Commander",
      last_name: "Farsight",
      email: "tauboy@email.com",
      password: "password",
      known_as: "Commander",
      role: "user",
    },
    {
      id: "6",
      first_name: "Ghazghkull",
      last_name: "Thraka",
      email: "orkboyz@email.com",
      password: "wordpass",
      known_as: "Ghazghkull",
      role: "user",
    },
    {
      id: "7",
      first_name: "King",
      last_name: "Szarekh",
      email: "szary@email.com",
      password: "password",
      known_as: "Szarekh",
      role: "user",
    },
    {
      id: "8",
      first_name: "Abaddon",
      last_name: "The Despoiler",
      email: "abbyD@email.com",
      password: "wordpass",
      known_as: "Abaddon",
      role: "user",
    },
  ]);
};
