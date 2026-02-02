"use server";
import { prisma } from "../db";
import { renderError } from "../helpers";
import {
  createResponseWithTeacherSchema,
  validateWithZodSchema,
} from "../schemas";
import { getUser } from "./userActions";

export const createResponseWithTeacher = async (
  prevState: any,
  formData: FormData
) => {
  try {
    const rawData = Object.fromEntries(formData);
    rawData.details = rawData.details
      ? JSON.parse(rawData.details as string)
      : null;

    const answers = Object.entries(rawData)
      .filter(
        ([key]) => !["formId", "teacherId", "location", "details"].includes(key)
      )
      .map(([key, value]) => ({ questionId: key, optionCode: Number(value) }));

    const validatedData = validateWithZodSchema(
      createResponseWithTeacherSchema,
      { ...rawData, answers }
    );

    const response = {
      formId: validatedData.formId,
      teacherId: validatedData.teacherId,
      teacherLocationId: validatedData.details.locationId,
      grade: validatedData.details.grade,
      period: validatedData.details.period ?? null,
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

    const validQuestionIds = new Set(
      form.questions.map((question: { id: string }) => question.id)
    );
    response.answers = response.answers.filter((answer) =>
      validQuestionIds.has(answer.questionId)
    );

    const teacher = await prisma.user.findUnique({
      where: {
        id: response.teacherId,
      },
    });

    if (!teacher) {
      throw Error("Invalid teacher id");
    }

    const teacherLocation = await prisma.userLocation.findUnique({
      where: {
        id: response.teacherLocationId,
      },
    });

    if (!teacherLocation) {
      throw Error("Invalid location id");
    }

    if (teacherLocation.userId !== response.teacherId) {
      throw Error("Invalid location id for the specified teacher");
    }

    if (teacherLocation.multiplePeriods && response.period === null) {
      throw Error("Period is a required field");
    }

    await prisma.responseWithTeacher.create({
      data: {
        ...response,
      },
    });

    // Add certificate and teacher parameters if form requires certificate
    const params = form.provideCertificate
      ? `?certificate=true&teacherId=${teacher.id}&teacherEmail=${encodeURIComponent(teacher.email)}&teacherName=${encodeURIComponent(teacher.name)}`
      : "";

    return {
      message: "Successfully submitted form",
      redirect: `/student/submissionSuccess/${encodeURIComponent(form.title)}${params}`,
    };
  } catch (error) {
    return renderError(error);
  }
};

export const getResponsesWithTeacherCount = async () => {
  const { userId } = await getUser();

  const responsesWithTeacher = await prisma.responseWithTeacher.findMany({
    where: {
      teacherId: userId as string,
    },
    include: {
      form: true,
    },
  });

  let numPreResponses = 0;
  let numPostResponses = 0;

  for (let i = 0; i < responsesWithTeacher.length; i++) {
    if (responsesWithTeacher[i].form.type === "pre") {
      numPreResponses += 1;
    } else {
      numPostResponses += 1;
    }
  }

  return { numPreResponses, numPostResponses };
};
