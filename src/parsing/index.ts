import fs from "fs";
import toml from "@iarna/toml";

import {
  RubricOption,
  RubricQuestion,
  RubricSelection,
  Warning,
  Product,
} from "./types";

export function loadRubric(): RubricQuestion[] {
  const questions: RubricQuestion[] = [];
  for (const file of fs
    .readdirSync("rubric/")
    .filter((file) => file.endsWith(".toml"))) {
    questions.push(
      toml.parse(
        fs.readFileSync("rubric/" + file, {
          encoding: "utf-8",
        })
      ) as any
    );
  }
  return questions;
}

export function loadProducts(questions: RubricQuestion[]): Product[] {
  const products: Product[] = [];
  const parentMap: Record<string, string> = {};
  for (const file of fs
    .readdirSync("products/")
    .filter((file) => file.endsWith(".toml"))) {
    const object: Product = toml.parse(
      fs.readFileSync("products/" + file, {
        encoding: "utf-8",
      })
    ) as any;

    if (object.parent != null) {
      parentMap[object.slug] = object.parent;
    }

    const rubric: RubricSelection[] = [];
    // Match items in the rubric object with their questions. We're only throwing errors here
    // because there is literally no way to parse the policies & link things together if certain
    // checks fail. All other checks should happen in distinct tests.
    for (const questionId of Object.keys(object["rubric"] || {})) {
      const question = questions.find(
        (question) => question.slug === questionId
      );
      if (question === undefined) {
        throw new Error(
          `there is no rubric question with the id "${questionId}"`
        );
      }
      const option = question.options.find(
        (option) => option.id === object["rubric"][questionId]["value"]
      );
      if (option === undefined) {
        throw new Error(
          `the rubric question "${questionId}" has no option "${
            object["rubric"][questionId]["value"]
          }" (valid options: ${question.options
            .map((option) => option.id)
            .join(", ")})`
        );
      }
      rubric.push({
        question: question,
        option: option,
        notes: [],
        citations: [],
        ...object["rubric"][questionId],
      });
    }

    products.push({
      warnings: [],
      children: [],
      policies: [],
      contributors: [],
      parent: null,
      ...object,
      rubric: rubric,
      score: calculateScore(rubric),
    } as any);
  }

  for (const childSlug of Object.keys(parentMap)) {
    const child = products.find((prod) => prod.slug == childSlug);
    const parent = products.find((prod) => prod.slug === child.parent);
    if (parent === undefined) {
      throw new Error(
        `the product "${childSlug}" refers to "${child.parent}" as a parent, but no such product exists`
      );
    }
    child.score = parent.score;
    parent.children.push(child);
  }

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
