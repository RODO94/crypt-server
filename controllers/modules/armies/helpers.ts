import { Army, CountedArmy } from "../../../types/armies";

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
