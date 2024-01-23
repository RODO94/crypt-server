/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex("rank").del();
  await knex("rank").insert([
    {
      id: "1",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "1",
      ranking: 36.75,
      prev_ranking: 1,
    },
    {
      id: "2",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "2",
      ranking: 30.12,
      prev_ranking: 1,
    },
    {
      id: "3",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "3",
      ranking: 23.54,
      prev_ranking: 8,
    },
    {
      id: "4",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "4",
      ranking: 24.67,
      prev_ranking: 17,
    },
    {
      id: "5",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "5",
      ranking: 32.78,
      prev_ranking: 2,
    },
    {
      id: "6",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "6",
      ranking: 30.12,
      prev_ranking: 4,
    },
    {
      id: "7",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "7",
      ranking: 12.23,
      prev_ranking: 12,
    },
    {
      id: "8",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "8",
      ranking: 40.65,
      prev_ranking: 9,
    },
    {
      id: "9",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "9",
      ranking: 20.11,
      prev_ranking: 5,
    },
    {
      id: "10",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "10",
      ranking: 22.43,
      prev_ranking: 1,
    },
    {
      id: "11",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "11",
      ranking: 24.32,
      prev_ranking: 3,
    },
    {
      id: "12",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "12",
      ranking: 31.65,
      prev_ranking: 8,
    },
    {
      id: "13",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "13",
      ranking: 34.78,
      prev_ranking: 7,
    },
    {
      id: "14",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "14",
      ranking: 14.57,
      prev_ranking: 6,
    },
    {
      id: "15",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "15",
      ranking: 10.11,
      prev_ranking: 4,
    },
    {
      id: "16",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "16",
      ranking: 12.55,
      prev_ranking: 14,
    },
    {
      id: "17",
      date: new Date("2024-02-10T03:54:00"),
      army_id: "17",
      ranking: 13.78,
      prev_ranking: 2,
    },
  ]);
};
