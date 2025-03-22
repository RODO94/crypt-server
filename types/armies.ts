export interface Army {
  name: string;
  army_id: string;
  id: string;
  known_as: string;
  ranking: string;
  emblem?: string;
  emblem_id?: string;
  type?: "fantasy" | "40k";
}

export interface CountedArmy extends Army {
  count: number;
}
