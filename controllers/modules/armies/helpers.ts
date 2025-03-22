import { Army, ArmyId, ArmyType, CountedArmy } from "../../../types/armies";
import database from "../../../database/db";

export const armyCountFn = (array: Army[]) => {
  const returnArray: CountedArmy[] = [];
  array.forEach((army) => {
    let armyBool = false;
    for (let i = 0; i < returnArray.length; i++) {
      if (
        returnArray[i].id === army.id &&
        returnArray[i].name === army.name &&
        returnArray[i].known_as === army.known_as
      ) {
        armyBool = true;
        returnArray[i].count++;
      }
    }
    if (armyBool !== true) {
      returnArray.push({ count: 1, ...army });
    }
  });

  return returnArray;
};

export const getRankAndPosition = async (type: ArmyType, armyID: ArmyId) => {
  const subquery = database("rank")
    .join("armies", "rank.army_id", "=", "armies.id")
    .select("army_id", "date", "ranking")
    .rowNumber("rn", { column: "date", order: "desc" }, "army_id")
    .where({ "armies.type": type })
    .as("ranks");

  const query = database(subquery)
    .select("army_id", "date", "ranking", "rn")
    .where("rn", 1)
    .orderBy("ranking", "desc");

  const currentRankPosition =
    (await query).findIndex((ranking) => ranking.army_id === armyID) + 1;

  return currentRankPosition;
};
