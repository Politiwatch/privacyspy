const toml = require("@iarna/toml");
const fs = require("fs");

const database = JSON.parse(
  fs
    .readFileSync("legacy/legacy_database.json", "utf-8")
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "")
);

let need_revision = new Set();
let contributors = new Set();

const DEBUG = true;

for (let entry of database) {
  console.log("Processing " + entry["name"]);

  if (DEBUG) {
    if (entry["slug"] == "stilt" || !entry["published"]) {
      need_revision.add(entry["name"]);
      continue;
    }
  }

  let policy = {};

  policy["name"] = entry["name"];
  policy["description"] = entry["description"];
  policy["slug"] = entry["slug"];
  policy["hostnames"] = entry["hostnames"];
  policy["sources"] = entry["sources"];
  policy["icon"] = entry["slug"] + ".png";

  policy["rubric"] = {};
  for (let rubric_entry of entry["rubric"]) {
    let question_slug = convertQuestionToId(rubric_entry["question"]["text"]);
    if (rubric_entry["answer"] === null) {
      need_revision.add(policy["name"]);
      continue;
    }
    let answer_slug = convertAnswerToId(
      rubric_entry["question"]["text"],
      rubric_entry["answer"]["text"]
    );
    let rubric_obj = { value: answer_slug };
    if (
      "citation" in rubric_entry["answer"] &&
      rubric_entry["answer"]["citation"] != ""
    ) {
      rubric_obj["citations"] = [rubric_entry["answer"]["citation"]];
    }
    if (
      "note" in rubric_entry["answer"] &&
      rubric_entry["answer"]["note"] != ""
    ) {
      rubric_obj["notes"] = [rubric_entry["answer"]["note"]];
    }
    if (
      !(
        "citation" in rubric_entry["answer"] &&
        rubric_entry["answer"]["citation"]
      ) &&
      !("note" in rubric_entry["answer"] && rubric_entry["answer"]["note"])
    ) {
      need_revision.add(policy["name"]);
      if (DEBUG) {
        continue;
      }
    }
    policy["rubric"][question_slug] = rubric_obj;
  }

  if (entry["warnings"].length > 0) {
    policy["updates"] = [];
    for (let warning of entry["warnings"]) {
      let update_obj = {
        title: warning["title"],
        description: warning["description"],
        // there are so few products that currently have warnings that it's easier to enter sources and fix dates ourselves
        date: warning["added"],
        sources: [],
      };

      policy["updates"].push(update_obj);
    }
  }

  policy["contributors"] = [];
  for (let contributor of entry["contributors"]) {
    if (contributor === "Igor") {
      policy["contributors"].push("ibarakaiev");
    } else if (contributor === "Miles") {
      policy["contributors"].push("milesmcc");
    } else {
      policy["contributors"].push(contributor);
    }
    contributors.add(contributor);
  }

  if (!need_revision.has(policy["name"])) {
    fs.writeFileSync(
      "products/" + policy.slug + ".toml",
      toml.stringify(policy)
    );
  }
}

console.log(
  "These policies need revision:\n" + Array.from(need_revision).join("\n")
);

console.log("\nThe following contributors were found:");
for (let c of Array.from(contributors)) {
  if (c != "Miles" && c != "Igor" && c != "doamatto")
    console.log("[" + c + "]\n");
}

function convertQuestionToId(questionText) {
  switch (questionText) {
    case "Does the service allow you to permanently delete your personal data?":
      return "data-deletion";
    case "Does the policy allow personally-targeted or behavioral marketing?":
      return "behavioral-marketing";
    case "Will affected users be notified when the policy is meaningfully changed?":
      return "revision-notify";
    case "Does the policy require users to be notified in case of a data breach?":
      return "data-breaches";
    case "Is it clear why the service collects the personal data that it does?":
      return "data-collection-reasoning";
    case "When does the policy allow law enforcement access to personal data?":
      return "law-enforcement";
    case "Does the service allow the user to control whether personal data is used or collected for non-critical purposes?":
      return "noncritical-purposes";
    case "Does the policy list the personal data it collects?":
      return "list-collected";
    case "Does the policy outline the service's general security practices?":
      return "security";
    case "Does the service allow third-party access to private personal data?":
      return "third-party-access";
    case "Does the service collect personal data from third parties?":
      return "third-party-collection";
    case "Is the policy's history made available?":
      return "history";
    default:
      throw "No slug exists for the following question: " + questionText;
  }
}

function convertAnswerToId(questionText, answerText) {
  switch (questionText) {
    case "Does the service allow you to permanently delete your personal data?":
      switch (answerText) {
        case "No":
          return "no";
        case "Yes, by contacting someone":
          return "yes-contact";
        case "Yes, using an automated mechanism":
          return "yes-automated";
        case "N/A (no personal information collected)":
          return "na";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Does the policy allow personally-targeted or behavioral marketing?":
      switch (answerText) {
        case "Yes":
          return "yes";
        case "Yes, but you can opt-out":
          return "yes-opt-out";
        case "Yes, but you must opt-in":
          return "yes-opt-in";
        case "No":
          return "no";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Will affected users be notified when the policy is meaningfully changed?":
      switch (answerText) {
        case "Yes":
          return "yes";
        case "No":
          return "no";
        case "N/A (no personal data—or contact information—collected)":
          return "na";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Does the policy require users to be notified in case of a data breach?":
      switch (answerText) {
        case "No":
          return "no";
        case "Yes, eventually":
          return "eventually";
        case "Yes, within 72 hours":
          return "yes-72";
        case "N/A (the service collects so little personal data that notification would not be possible)":
          return "na";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Is it clear why the service collects the personal data that it does?":
      switch (answerText) {
        case "No":
          return "no";
        case "Yes":
          return "yes";
        case "Somewhat":
          return "somewhat";
        case "Mostly":
          return "mostly";
        case "No personal data is collected":
          return "na";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Is the policy's history made available?":
      switch (answerText) {
        case "No":
          return "no";
        case "Yes, with revisions or a change-log":
          return "yes";
        case "Only the date it was last modified":
          return "last-modified";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "When does the policy allow law enforcement access to personal data?":
      switch (answerText) {
        case "Always":
          return "always";
        case "Not specified":
          return "unspecified";
        case "When reasonably requested":
          return "reasonable";
        case "Only when required by a court order or subpoena":
          return "strict";
        case "N/A (no personal data to share)":
          return "na";
        case "Never (special legal jurisdiction)":
          return "never";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Does the service allow the user to control whether personal data is used or collected for non-critical purposes?":
      switch (answerText) {
        case "No":
          return "no";
        case "On an opt-out basis, but only for some non-critical data/uses":
          return "opt-out-some";
        case "On an opt-out basis, for all non-critical data/uses":
          return "opt-out-all";
        case "On an opt-in basis":
          return "opt-out-all";
        case "N/A (no data used for non-critical purposes)":
          return "na";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Does the policy list the personal data it collects?":
      switch (answerText) {
        case "No":
          return "no";
        case "Only summarily":
          return "summarily";
        case "Yes, generally":
          return "generally";
        case "Yes, exhaustively":
          return "exhaustively";
        case "N/A (no personal information is collected)":
          return "na";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Does the policy outline the service's general security practices?":
      switch (answerText) {
        case "No":
          return "no";
        case "Somewhat":
          return "somewhat";
        case "Yes":
          return "yes";
        case "Yes, including audits":
          return "yes-audits";
        case "Yes, including independent audits":
          return "yes-independent-audits";
        case "N/A (no personal data collected)":
          return "na";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Does the service allow third-party access to private personal data?":
      switch (answerText) {
        case "No":
          return "no";
        case "Yes, all parties specified (only to critical service providers)":
          return "yes-specified-critical";
        case "Yes, not all parties specified (but only to critical service providers)":
          return "yes-unspecified-critical";
        case "Yes, all parties specified (including non-critical service providers such as advertisers)":
          return "yes-specified-noncritical";
        case "Yes, not all parties specified":
          return "yes-unspecified";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Does the service collect personal data from third parties?":
      switch (answerText) {
        case "No":
          return "no";
        case "Yes":
          return "yes";
        case "Only for critical data":
          return "critical-only";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    case "Is the policy's history made available?":
      switch (answerText) {
        case "No":
          return "no";
        case "Only the date it was last modified":
          return "last-modified";
        case "Yes, with revisions or a changelog":
          return "yes";
        default:
          throw (
            'Question "' +
            questionText +
            '" does not contain the answer "' +
            answerText +
            '"'
          );
      }
    default:
      throw "No slug exists for the following question: " + questionText;
  }
}
