import { loadRubric, loadProducts, loadContributors } from "../parsing/index";
import { Product, RubricQuestion } from "../parsing/types";
import { isMinFullSentence } from "./utils";
import fs from "fs";

const sizeOf = require("image-size");

const rubric: RubricQuestion[] = loadRubric();
const products: Product[] = loadProducts(rubric, loadContributors());

// What's going on with these test descriptions? We have a homegrown system
// to provide line-level annotations for our product TOML files.
// The file name goes in the square brackets, and what to search for (regex)
// to find the line numbers goes in the curly brackets.

for (const product of products) {
  describe(`[products/${product.slug}.toml] Product '${product.name}'`, () => {
    test(`must have a unique slug {slug}`, () => {
      expect(products.filter((p) => p.slug === product.slug).length).toEqual(1);
    });

    test(`must have contributors listed {contributors}`, () => {
      expect(product.contributors.length).toBeGreaterThan(0);
    });

    describe(`must have a valid description that is a full sentence {description}`, () => {
      isMinFullSentence(product.description);
    });

    test(`slug must be fully lowercase {slug}`, () => {
      expect(product.slug.toLowerCase()).toEqual(product.slug);
    });

    // The following isn't a particularly useful test, but it ensures that Jest waits for all handles to close.
    test(`last updated must load`, async () => {
      expect(await product.lastUpdated).toBeDefined();
    });

    describe(`must have hostname(s) {hostnames}`, () => {
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

      test(`that is mostly square`, () => {
        let dimensions = sizeOf("icons/" + product.icon);
        let aspectRatio = dimensions.width / dimensions.height;
        expect(Math.abs(1 - aspectRatio)).toBeLessThanOrEqual(0.2);
      })
    });

    if (product.parent != null) {
      describe(`is a child product`, () => {
        test(`so it must not have any sources (use parent product instead) {sources}`, () => {
          expect(product.sources.length).toBe(0);
        });
        test(`so it must not be graded (use parent product instead) {rubric}`, () => {
          expect(product.rubric.length).toBe(0);
        });
        test(`so it must not have any updates (use parent product instead) {updates}`, () => {
          expect(product.updates.length).toBe(0);
        });
      });
    } else {
      test(`must have link(s) to the original policy (sources) {sources}`, () => {
        expect(product.sources.length).toBeGreaterThan(0);
      });

      for (const question of rubric) {
        describe(`question '${question.slug}' {rubric.${question.slug}}`, () => {
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
        describe(`update '${update.title} {[[updates]]}'`, () => {
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
