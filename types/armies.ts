export type ArmyId = string;
export type UserId = string;
export type ArmyType = "fantasy" | "40k";

export interface Army {
  name: string;
  army_id: ArmyId;
  id?: string;
  known_as?: string;
  ranking?: string;
  emblem?: string;
  emblem_id?: string;
  type?: ArmyType;
}

export interface CountedArmy extends Army {
  count: number;
}

export interface ArmyRank {
  date: string;
  id: string;
  army_id: string;
  ranking: string;
  prev_ranking: number;
}
