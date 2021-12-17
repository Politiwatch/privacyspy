import fs from "fs";
import toml from "@iarna/toml";

import { loadRubric, loadProducts, loadContributors } from "../parsing";

let files: string[] = ["CONTRIBUTORS.toml"];

files = files.concat(
  fs
    .readdirSync("./rubric/")
    .filter((name) => name.endsWith(".toml"))
    .map((file) => "rubric/" + file)
);
files = files.concat(
  fs
    .readdirSync("./products/")
    .filter((name) => name.endsWith(".toml"))
    .map((file) => "products/" + file)
);

for (const file of files) {
  describe(`[${file}]`, () => {
    test("Must be valid TOML", () => {
      expect(() => {
        toml.parse(
          fs.readFileSync(file, {
            encoding: "utf-8",
          })
        );
      }).not.toThrowError();
    });
  });
}

test("Rubric must parse correctly", () => {
  expect(() => {
    loadRubric();
  }).not.toThrowError();
});

test("Contributors must parse correctly", () => {
  expect(() => {
    loadContributors();
  }).not.toThrowError();
});

test("Products must parse correctly", () => {
  expect(() => {
    loadProducts(loadRubric(), loadContributors());
  }).not.toThrowError();
});
