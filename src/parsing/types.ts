export interface RubricOption {
  id: string;
  text: string;
  percent: number;
  description?: string;
}

export interface Contributor {
  slug: string;
  name?: string;
  website?: string;
  github?: string;
  email?: string;
  role: "founder" | "admin" | "moderator" | "contributor";
}

export interface RubricQuestion {
  category: "transparency" | "collection" | "handling";
  slug: string;
  text: string;
  notes: string[];
  points: number;
  options: RubricOption[];
}

export interface RubricSelection {
  question: RubricQuestion;
  option: RubricOption;
  notes: string[];
  citations: string[];
}

export interface Update {
  title: string;
  description: string;
  date?: Date;
  sources: URL[];
}

export interface Product {
  name: string;
  description: string;
  hostnames: string[];
  sources: URL[];
  icon: string;
  slug: string;
  score: number;
  parent?: string;
  children: Product[];
  rubric: RubricSelection[];
  updates: Update[];
  lastUpdated: Date;
  contributors: Contributor[];
}
