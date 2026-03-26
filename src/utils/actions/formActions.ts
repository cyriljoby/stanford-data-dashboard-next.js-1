"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../db";
import { renderError } from "../helpers";
import {
  addFormSchema,
  updateFormSchema,
  validateWithZodSchema,
} from "../schemas";
import { ensureStanfordUser } from "./userActions";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { question } from "../types";

export const addForm = async (prevState: any, formData: FormData) => {
  try {
    await ensureStanfordUser();

    const rawData = Object.fromEntries(formData);
    rawData.questions = JSON.parse(rawData.questions as string).map(
      (question: question) => {
        const id = uuidv4();

        return { ...question, id, name: question.name };
      }
    );
    const validatedFields = validateWithZodSchema(addFormSchema, rawData);

    const dbForm = await prisma.form.findFirst({
      where: {
        title: { equals: validatedFields.title, mode: "insensitive" },
        type: validatedFields.type,
      },
    });

    if (dbForm) {
      throw Error("A form with this title and type already exists.");
    }

    if (validatedFields.type === "post") {
      const preForm = await prisma.form.findFirst({
        where: {
          title: { equals: validatedFields.title, mode: "insensitive" },
          type: "pre",
        },
      });

      if (!preForm) {
        throw Error(
          "A matching 'pre' form with the same title must exist before creating a 'post' form"
        );
      }
    }

    await prisma.form.create({
      data: {
        ...validatedFields,
      },
    });

    return {
      message: "Successfully added form",
      redirect: "/dashboard/manageForms",
    };
  } catch (error) {
    return renderError(error);
  }
};

export const getAllForms = async () => {
  const forms = await prisma.form.findMany({
    // omit: {
    //   questions: true,
    // },
    orderBy: {
      createdAt: "desc",
    },
  });

  return forms;
};

export const duplicateForm = async (prevState: any, formData: FormData) => {
  void formData;
  try {
    await ensureStanfordUser();

    const { formId, title: customTitle } = prevState;
    const source = await prisma.form.findUnique({ where: { id: formId } });

    if (!source) throw Error("Form not found");

    await prisma.form.create({
      data: {
        title: customTitle || `Copy of ${source.title}`,
        type: source.type,
        active: false,
        provideCertificate: source.provideCertificate,
        questions: {
          set: source.questions.map((q: any) => ({
            ...q,
            id: uuidv4(),
          })),
        },
      },
    });

    revalidatePath("/dashboard/manageForms");
    return { message: "Successfully duplicated form" };
  } catch (error) {
    return renderError(error);
  }
};

export const deleteForm = async (prevState: any, formData: FormData) => {
  void formData;
  try {
    await ensureStanfordUser();

    const { formId } = prevState;
    await prisma.form.delete({
      where: {
        id: formId,
      },
    });

    revalidatePath("/dashboard/manageForms");
    return { message: "Succesfully deleted form" };
  } catch (error) {
    return renderError(error);
  }
};

export const getSingleForm = async (formId: string) => {
  const form = await prisma.form.findUnique({ where: { id: formId } });

  if (form) {
    return form;
  }

  return redirect("/dashboard/manageForms");
};

export const updateForm = async (prevState: any, formData: FormData) => {
  try {
    await ensureStanfordUser();

    const rawData = Object.fromEntries(formData.entries());
    const validatedFields = validateWithZodSchema(updateFormSchema, rawData);

    const form = await prisma.form.findUnique({
      where: {
        id: validatedFields.formId,
      },
    });

    if (!form) {
      throw Error("Invalid form id");
    }

    if (form.type === "pre" && validatedFields.provideCertificate) {
      throw Error("You cannot enable certificates for pre-surveys");
    }

    await prisma.form.update({
      where: {
        id: validatedFields.formId,
      },
      data: {
        active: validatedFields.active,
        provideCertificate: validatedFields.provideCertificate,
      },
    });

    return {
      message: "Succesfully updated form",
      redirect: "/dashboard/manageForms",
    };
  } catch (error) {
    return renderError(error);
  }
};

export const getActiveForms = async () => {
  const activeForms = await prisma.form.findMany({
    where: {
      active: true,
    },
    select: {
      title: true,
    },
  });

  const titles = activeForms.map((form) => form.title);
  return new Set(titles);
};

export const getSingleActiveForm = async (formId: string) => {
  const form = await prisma.form.findUnique({
    where: {
      id: formId,
      active: true,
    },
  });

  if (form) {
    return form;
  }

  return redirect("/");
};

export const emailCertificate = async (prevState: any, formData: FormData) => {
  try {
    const studentName = formData.get("name") as string;
    const studentEmail = formData.get("email") as string;
    const formTitle = formData.get("formTitle") as string;
    const teacherEmail = formData.get("teacherEmail") as string;
    const teacherName = formData.get("teacherName") as string;

    if (!studentName || !teacherEmail || !teacherName || !formTitle) {
      throw Error("Missing required fields");
    }

    // Generate certificate PDF
    const { generateCertificate } = await import("../certificate/generate");

    const certificatePdf = await generateCertificate({
      studentName,
      formTitle,
      completionDate: new Date(),
    });

    // Import the email function
    const { sendFormCompletionEmail } = await import(
      "../email/certificate-email"
    );

    // Send notification to teacher with certificate attached
    await sendFormCompletionEmail(
      teacherEmail,
      teacherName,
      formTitle,
      new Date(),
      studentName,
      certificatePdf
    );

    // Send certificate to student email if provided
    if (studentEmail) {
      await sendFormCompletionEmail(
        studentEmail,
        studentName,
        formTitle,
        new Date(),
        studentName,
        certificatePdf
      );
    }

    // Return success with PDF data for display
    return {
      message: "Successfully sent notifications",
      certificateUrl: `data:application/pdf;base64,${certificatePdf.toString("base64")}`,
    };
  } catch (error) {
    return renderError(error);
  }
};
