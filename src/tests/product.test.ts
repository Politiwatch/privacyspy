import { loadRubric, loadProducts, loadContributors } from "../parsing/index";
import { Product, RubricQuestion } from "../parsing/types";
import { isMinFullSentence } from "./utils";
import fs from "fs";

const rubric: RubricQuestion[] = loadRubric();
const products: Product[] = loadProducts(rubric, loadContributors());

for (const product of products) {
  describe(`[product/${product.slug}.toml] Product '${product.name}'`, () => {
    test(`must have a unique slug`, () => {
      expect(products.filter((p) => p.slug === product.slug).length).toEqual(1);
    });

    test(`must have contributors listed`, () => {
      expect(product.contributors.length).toBeGreaterThan(0);
    });

    describe(`must have a valid description that is a full sentence`, () => {
      isMinFullSentence(product.description);
    });

    describe(`must have hostname(s)`, () => {
      test("that exist", () => {
        expect(product.hostnames.length).toBeGreaterThan(0);
      });

      test.each(product.hostnames)(
        "that are valid (don't specify protocol)",
        (hostname) => {
          expect(hostname.startsWith("http://")).toBeFalsy();
          expect(hostname.startsWith("https://")).toBeFalsy();
        }
      );
    });

    describe(`must have an icon in the 'icons/' directory`, () => {
      test("that exists", () => {
        expect(product.icon).not.toBeUndefined();
        expect(fs.existsSync("icons/" + product.icon)).toBeTruthy();
      });

      test(`that is smaller than 30kb`, () => {
        expect(fs.statSync("icons/" + product.icon).size).toBeLessThan(30000);
      });
    });
    if (product.parent != null) {
      describe(`is a child product`, () => {
        test(`so it must not have any sources (use parent product instead)`, () => {
          expect(product.sources.length).toBe(0);
        });
        test(`so it must not be graded (use parent product instead)`, () => {
          expect(product.rubric.length).toBe(0);
        });
        test(`so it must not have any updates (use parent product instead)`, () => {
          expect(product.updates.length).toBe(0);
        });
      });
    } else {
      test(`must have link(s) to the original policy`, () => {
        expect(product.sources.length).toBeGreaterThan(0);
      });

      for (const question of rubric) {
        describe(`question '${question.slug}'`, () => {
          const selection = product.rubric.find(
            (item) => item.question.slug === question.slug
          );

          test("must be scored", () => {
            expect(selection).not.toBeUndefined();
          });

          test("must have either a note or a citation", () => {
            expect(
              selection.notes.length > 0 || selection.citations.length > 0
            ).toBeTruthy();
          });
        });
      }

      for (const update of product.updates) {
        describe(`update '${update.title}'`, () => {
          test("must have a title", () => {
            expect(update.title.length).toBeGreaterThan(0);
          });

          describe("must have a full-sentence description", () => {
            isMinFullSentence(update.description);
          });

          test("must have sources", () => {
            expect(update.sources.length).toBeGreaterThan(0);
          });
        });
      }
    }
  });
}
