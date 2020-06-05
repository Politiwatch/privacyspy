import fs from "fs";
import toml from "toml";

import {
  RubricOption,
  RubricQuestion,
  RubricSelection,
  Warning,
  Product,
} from "./types";

export function loadRubric(): RubricQuestion[] {
  let questions: RubricQuestion[] = [];
  for (let file of fs
    .readdirSync("rubric/")
    .filter((file) => file.endsWith(".toml"))) {
    questions.push(
      toml.parse(
        fs.readFileSync("rubric/" + file, {
          encoding: "utf-8",
        })
      )
    );
  }
  return questions;
}

export function loadProducts(questions: RubricQuestion[]): Product[] {
  let products: Product[] = [];
  let parentMap: { string: string } = {};
  for (let file of fs
    .readdirSync("products/")
    .filter((file) => file.endsWith(".toml"))) {
    let object = toml.parse(
      fs.readFileSync("products/" + file, {
        encoding: "utf-8",
      })
    );

    if (object.parent !== undefined) {
      parentMap[object.slug] = object.parent;
    }

    let rubric: RubricSelection[] = [];
    // Match items in the rubric object with their questions. We're only throwing errors here
    // because there is literally no way to parse the policies & link things together if certain
    // checks fail. All other checks should happen in distinct tests.
    for (let questionId of Object.keys(object["rubric"] || {})) {
      let question = questions.find((question) => question.slug === questionId);
      if (question === undefined) {
        throw new Error(
          `there is no rubric question with the id "${questionId}"`
        );
      }
      let option = question.options.find(
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
      parent: null,
      ...object,
      rubric: rubric,
      score: calculateScore(rubric),
    });
  }

  for (let childSlug of Object.keys(parentMap)) {
    let child = products.find((prod) => prod.slug == childSlug);
    let parent = products.find((prod) => prod.slug === child.parent);
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
function calculateScore(selections: RubricSelection[]): string {
  let totalPoints = 0;
  let earnedPoints = 0;
  for (let selection of selections) {
    totalPoints += selection.question.points;
    earnedPoints +=
      (selection.option.percent / 100.0) * selection.question.points;
  }
  return ((earnedPoints * 10) / totalPoints).toFixed(1);
}
