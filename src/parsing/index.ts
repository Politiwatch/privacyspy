import fs from "fs";
import toml from "@iarna/toml";
import { RubricQuestion, RubricSelection, Warning, Product } from "./types";
import { getQuestionBySlug, getOptionBySlug } from "./utils";

export function loadRubric(): RubricQuestion[] {
  const files = fs
    .readdirSync("rubric/")
    .filter((file) => file.endsWith(".toml"));

  const entries: RubricQuestion[] = [];
  for (const file of files) {
    const rubric_entry = toml.parse(
      fs.readFileSync("rubric/" + file, {
        encoding: "utf-8",
      })
    ) as any;

    entries.push(rubric_entry);
  }

  return entries;
}

export function loadProducts(questions: RubricQuestion[]): Product[] {
  const files = fs
    .readdirSync("products/")
    .filter((file) => file.endsWith(".toml"));

  const products: Product[] = [];
  const rubric: RubricSelection[] = [];
  const parentMap: Record<string, string> = {};

  for (const file of files) {
    const product: Product = toml.parse(
      fs.readFileSync("products/" + file, {
        encoding: "utf-8",
      })
    ) as any;

    if (product.parent !== undefined) {
      parentMap[product.slug] = product.parent;
    } else {
      // Match items in the rubric object with their questions. We're only throwing errors here
      // because there is literally no way to parse the policies & link things together if certain
      // checks fail. All other checks should happen in distinct tests.
      for (const questionSlug in product["rubric"]) {
        const question = getQuestionBySlug(questions, questionSlug);

        const option = getOptionBySlug(
          question.options,
          product["rubric"][questionSlug]["value"],
          questionSlug
        );

        rubric.push({
          question: question,
          option: option,
          notes: [],
          citations: [],
          ...product["rubric"][questionSlug],
        });
      }
    }

    products.push({
      warnings: [],
      children: [],
      sources: [],
      contributors: [],
      parent: null,
      ...product,
      rubric: rubric,
      score: calculateScore(rubric),
    } as any);
  }

  for (const childSlug in parentMap) {
    const child = products.find((el) => el.slug === childSlug);
    const parent = products.find((el) => el.slug === child.parent);
    if (parent === undefined) {
      throw new Error(
        `the product "${childSlug}" refers to "${child.parent}" as a parent, but no such product exists`
      );
    }
    child.score = parent.score;
    parent.children.push(child);
  }

  products.sort((a, b) => {
    if (a.slug > b.slug) return 1;
    else if (a.slug < b.slug) return -1;
    return 0;
  });

  return products;
}

// Calculates the product's overall score and returns a number between
// 0 and 10 (inclusive).
function calculateScore(selections: RubricSelection[]): number {
  let totalPoints = 0;
  let earnedPoints = 0;
  for (const selection of selections) {
    totalPoints += selection.question.points;
    earnedPoints +=
      (selection.option.percent / 100.0) * selection.question.points;
  }
  return Number.parseFloat(((earnedPoints * 10) / totalPoints).toFixed(1));
}
