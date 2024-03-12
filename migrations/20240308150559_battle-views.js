/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createView("rank_view", function (view) {
    view.columns(["army_id", "date", "ranking", "rn"]);
    view.as(
      knex("rank")
        .select("army_id", "date", "ranking")
        .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
        .as("ranks")
    );
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropView("rank_view");
};
