import fs from "fs";
import toml from "@iarna/toml";
import { RubricQuestion, RubricSelection, Product, Contributor } from "./types";
import { getQuestionBySlug, getOptionBySlug } from "./utils";

export function loadContributors(): Contributor[] {
  const data: object = toml.parse(
    fs.readFileSync("CONTRIBUTORS.toml", { encoding: "utf-8" })
  );
  const contributors: Contributor[] = [];
  for (const slug of Object.keys(data)) {
    contributors.push({
      slug: slug,
      role: "contributor",
      ...data[slug],
    });
  }
  return contributors;
}

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

export function loadProducts(
  questions: RubricQuestion[],
  contributors: Contributor[]
): Product[] {
  const files = fs
    .readdirSync("products/")
    .filter((file) => file.endsWith(".toml"));

  const products: Product[] = [];
  const parentMap: Record<string, string> = {};

  for (const file of files) {
    const rubric: RubricSelection[] = [];

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

    // There are shorter ways to get the contributors, such as filtering the list of all contributors
    // by whether they are listed in the policy, but this is the only approach I could come up with that
    // would explicitly throw an error when a contributor is listed erroneously.
    const productContributors: Contributor[] = [];
    for (const contributorSlug of product.contributors) {
      const contributor = contributors.find(
        (potentialContributor) =>
          potentialContributor.slug == <string>(<unknown>contributorSlug)
      );
      if (contributor === undefined) {
        throw new Error(
          `the product lists '${contributorSlug}' as a contributor, but no such contributor exists in CONTRIBUTORS.toml`
        );
      }
      productContributors.push(contributor);
    }

    products.push({
      updates: [],
      children: [],
      sources: [],
      parent: null,
      ...product,
      rubric: rubric,
      score: calculateScore(rubric),
      contributors: productContributors,
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
