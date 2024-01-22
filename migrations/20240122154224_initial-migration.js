/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable("users", (table) => {
      table.string("id").primary();
      table.string("first_name").notNullable();
      table.string("last_name").notNullable();
      table.string("email").notNullable();
      table.string("password").notNullable();
      table.string("known_as");
      table.string("role").notNullable();
    })
    .createTable("armies", (table) => {
      table.string("id").primary();
      table.string("name").notNullable();
      table.string("emblem_id").references("emblems.id");
      table.string("type").notNullable();
      table
        .string("user_id")
        .notNullable()
        .references("users.id")
        .onUpdate("CASCADE")
        .onDelete("CASCADE");
      table.foreign("user_id");
    })
    .createTable("matches", (table) => {
      table.string("id").primary();
      table.date("date").notNullable();
      table.string("result");
      table.string("winner");
      table.string("status");
      table.string("match_type").notNullable();
      table.string("player_type").notNullable();
      table.string("player_1_id").references("combatant.id");
      table.string("player_2_id").references("combatant.id");
      table.foreign("player_1_id");
      table.foreign("player_2_id");
    })
    .createTable("rank", (table) => {
      table.date("date").notNullable();
      table.string("id").primary();
      table
        .string("army_id")
        .notNullable()
        .references("armies.id")
        .onUpdate("CASCADE")
        .onDelete("CASCADE");
      table.smallint("rank").notNullable();
      table.smallint("prev_rank");
      table
        .string("army_id")
        .references("armies.id")
        .notNullable()
        .onUpdate("CASCADE")
        .onDelete("CASCADE");
    })
    .createTable("combatants", (table) => {
      table.string("id").primary();
      table.string("match_id").references("matches.id").notNullable();
      table.string("army_id").references("armies.id").notNullable();
      table.string("team_id").references("teams.id");
      table.foreign("match_id");
      table.foreign("army_id");
    })
    .createTable("emblems", (table) => {
      table.string("id").primary();
      table.binary("emblem_blob").notNullable();
      table.string("emblem_name").notNullable();
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {};
