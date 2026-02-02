"use server";

import { prisma } from "../db";
import { renderError } from "../helpers";
import {
  createResponseWithoutTeacherSchema,
  validateWithZodSchema,
} from "../schemas";

export const createResponseWithoutTeacher = async (
  prevState: any,
  formData: FormData
) => {
  try {
    const rawData = Object.fromEntries(formData);
    rawData.details = rawData.details
      ? JSON.parse(rawData.details as string)
      : null;
    rawData.location = rawData.location
      ? JSON.parse(rawData.location as string)
      : null;

    const answers = Object.entries(rawData)
      .filter(([key]) => !["formId", "location", "details"].includes(key))
      .map(([key, value]) => ({ questionId: key, optionCode: Number(value) }));

    const validatedData = validateWithZodSchema(
      createResponseWithoutTeacherSchema,
      {
        ...rawData,
        answers,
      }
    );

    const location = await prisma.location.findFirst({
      where: {
        country: validatedData.location.country,
        state: validatedData.location.state,
        city: validatedData.location.city,
        school: validatedData.location.school,
      },
    });

    if (!location) {
      throw Error(
        "Location not found with the provided country, state (if applicable), city, and school"
      );
    }

    const response = {
      formId: validatedData.formId,
      locationId: location.id,
      grade: validatedData.details.grade,
      answers: validatedData.answers,
    };

    const form = await prisma.form.findUnique({
      where: {
        id: response.formId,
      },
    });

    if (!form) {
      throw Error("Invalid form id");
    }

    if (form.provideCertificate) {
      throw Error("A teacher code is required to submit this form");
    }

    const validQuestionIds = new Set(
      form.questions.map((question) => question.id)
    );
    response.answers = response.answers.filter((answer) =>
      validQuestionIds.has(answer.questionId)
    );

    await prisma.responseWithoutTeacher.create({
      data: {
        ...response,
      },
    });

    return {
      message: "Successfully submitted form",
      redirect: `/student/submissionSuccess/${encodeURIComponent(form.title)}`,
    };
  } catch (error) {
    return renderError(error);
  }
};
