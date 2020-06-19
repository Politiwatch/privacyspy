import { loadRubric, loadProducts, loadContributors } from "../parsing/index";
import { Product, RubricQuestion } from "../parsing/types";
import { isMinFullSentence } from "./utils";
import fs from "fs";

const rubric: RubricQuestion[] = loadRubric();
const products: Product[] = loadProducts(rubric, loadContributors());

describe("Product", () => {
  for (const product of products) {
    describe(`${product.name}`, () => {
      test(`has a unique slug`, () => {
        expect(products.filter((p) => p.slug === product.slug).length).toEqual(
          1
        );
      });

      describe(`has a valid description that is a full sentence`, () => {
        isMinFullSentence(product.description);
      });

      describe(`has hostname(s)`, () => {
        test("at least one exists", () => {
          expect(product.hostnames.length).toBeGreaterThan(0);
        });

        test.each(product.hostnames)(
          "%s is a valid hostname (doesn't specify protocol)",
          (hostname) => {
            expect(hostname.startsWith("http://")).toBeFalsy();
            expect(hostname.startsWith("https://")).toBeFalsy();
          }
        );
      });

      /*
      describe(`has a valid icon in the 'icons/' directory`, () => {
        test("icon exists", () => {
          expect(product.icon).not.toBeUndefined();
          expect(product.icon.startsWith("icons/")).toBeTruthy();
          expect(fs.existsSync(product.icon)).toBeTruthy();
        });

        test(`${product.name} icon is smaller than 30kb`, () => {
          expect(fs.statSync(product.icon).size).toBeLessThan(30000);
        });
      });*/
      if (product.parent != null) {
        describe(`is a child product`, () => {
          test(`has no link(s) to original policies`, () => {
            expect(product.sources.length).toBe(0);
          });
          test(`has no rubric assessments`, () => {
            expect(product.rubric.length).toBe(0);
          });
          test(`has no updates`, () => {
            expect(product.updates.length).toBe(0);
          });
        });
      } else {
        test(`has link(s) to the original policy`, () => {
          expect(product.sources.length).toBeGreaterThan(0);
        });

        for (const question of rubric) {
          describe(`question '${question.slug}'`, () => {
            const selection = product.rubric.find(
              (item) => item.question.slug === question.slug
            );

            test("is scored", () => {
              expect(selection).not.toBeUndefined();
            });

            test("has either a note or a citation", () => {
              expect(
                selection.notes.length > 0 || selection.citations.length > 0
              ).toBeTruthy();
            });
          });
        }

        for (const update of product.updates) {
          describe(`update "${update.title}" is valid`, () => {
            test("has a title", () => {
              expect(update.title.length).toBeGreaterThan(0);
            });

            describe("has a full-sentence description", () => {
              isMinFullSentence(update.description);
            });

            test("has sources", () => {
              expect(update.sources.length).toBeGreaterThan(0);
            });
          });
        }
      }
    });
  }
});
