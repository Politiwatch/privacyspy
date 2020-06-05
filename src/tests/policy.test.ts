import { loadRubric, loadProducts } from "../parsing";
import { Product, RubricQuestion } from "../parsing/types";
import { isMinFullSentence } from "./utils";
import fs from "fs";

let rubric: RubricQuestion[] = loadRubric();
let products: Product[] = loadProducts(rubric);

describe("Product validation", () => {
    for (let product of products) {
        describe(`${product.name}`, () => {
            test(`has a unique slug`, () => {
                expect(products.filter(p => p.slug === product.slug).length).toEqual(1);
            });
        
            describe(`has a valid description that is a full sentence`, () => {
                isMinFullSentence(product.description);
            });
        
            describe(`has hostname(s)`, () => {
                test("at least one exists", () => {
                    expect(product.hostnames.length).toBeGreaterThan(0);
                });
        
                test.each(product.hostnames)("%s is a valid hostname (doesn't specify protocol)", hostname => {
                    expect(hostname.startsWith("http://")).toBeFalsy();
                    expect(hostname.startsWith("https://")).toBeFalsy();
                });
            });

            describe(`has a valid icon in the 'icons/' directory`, () => {
                test("icon exists", () => {
                    expect(product.icon).not.toBeUndefined();
                    expect(product.icon.startsWith("icons/")).toBeTruthy();
                    expect(fs.existsSync(product.icon)).toBeTruthy();
                });
        
                test(`${product.name} icon is smaller than 30kb`, () => {
                    expect(fs.statSync(product.icon).size).toBeLessThan(30000);
                });
            });
            if (product.parent != null) {
                describe(`is a child product`, () => {
                    test(`has no link(s) to original policies`, () => {
                        expect(product.policies.length).toBe(0);
                    });
                    test(`has no rubric assessments`, () => {
                        expect(product.rubric.length).toBe(0);
                    });
                    test(`has no warnings`, () => {
                        expect(product.warnings.length).toBe(0);
                    });
                });
            } else {
                test(`has link(s) to the original policy`, () => {
                    expect(product.policies.length).toBeGreaterThan(0);
                });
        
                for (let question of rubric) {
                    describe(`question '${question.slug}'`, () => {
                        let selection = product.rubric.find(item => item.question.slug === question.slug);
    
                        test("is scored", () => {
                            expect(selection).not.toBeUndefined();
                        });
    
                        test("has either a note or a citation", () => {
                            expect(selection.notes.length > 0 || selection.citations.length > 0).toBeTruthy();
                        })
                    });
                }
    
                for (let warning of product.warnings) {
                    describe(`warning "${warning.title}" is valid`, () => {
                        test("severity is either low, medium, or high", () => {
                            expect(["low", "medium", "high"].includes(warning.severity)).toBeTruthy();
                        })
    
                        test("has a title", () => {
                            expect(warning.title.length).toBeGreaterThan(0);
                        });
    
                        describe("has a full-sentence description", () => {
                            isMinFullSentence(warning.description);
                        });
    
                        test("has sources", () => {
                            expect(warning.sources.length).toBeGreaterThan(0);
                        });
                    });
                }
            }
        });
    };
})