export interface RubricOption {
  id: string;
  text: string;
  percent: number;
  description?: string;
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

export interface Warning {
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
  warnings: Warning[];
  lastUpdated: Date;
  contributors: string[];
}
