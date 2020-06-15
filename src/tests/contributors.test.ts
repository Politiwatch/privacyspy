import { Contributor } from "../parsing/types";
import { loadContributors } from "../parsing/index";

let contributors: Contributor[] = loadContributors();

describe("Contributor", () => {
    for(let contributor of contributors){
        describe(contributor.slug, () => {
            
        });
    }
});