import fs from "fs";
import { Product, RubricQuestion, RubricOption } from "../parsing/types";

export function getQuestionBySlug(
  questions: RubricQuestion[],
  questionSlug: string
): RubricQuestion {
  const question = questions.find((question) => question.slug === questionSlug);
  if (question === undefined) {
    throw new Error(
      `there is no rubric question with the id "${questionSlug}"`
    );
  }

  return question;
}

export function getOptionBySlug(
  options: RubricOption[],
  optionSlug: string,
  questionSlug: string
): RubricOption {
  const option = options.find((option) => option.id === optionSlug);
  if (option === undefined) {
    throw new Error(
      `the rubric question "${questionSlug}" has no option "${optionSlug}" (valid options: ${options
        .map((option) => option.id)
        .join(", ")})`
    );
  }

  return option;
}
