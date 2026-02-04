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
    console.log("DEBUG emailCertificate called");
    const studentName = formData.get("name") as string;
    const studentEmail = formData.get("email") as string;
    const formTitle = formData.get("formTitle") as string;
    const teacherEmail = formData.get("teacherEmail") as string;
    const teacherName = formData.get("teacherName") as string;

    console.log("DEBUG emailCertificate params:", { studentName, studentEmail, formTitle, teacherEmail, teacherName });

    if (!studentName || !teacherEmail || !teacherName || !formTitle) {
      console.log("DEBUG emailCertificate missing fields");
      throw Error("Missing required fields");
    }

    // Generate certificate PDF
    console.log("DEBUG generating certificate...");
    const { generateCertificate } = await import("../certificate/generate");

    const certificatePdf = await generateCertificate({
      studentName,
      formTitle,
      completionDate: new Date(),
    });
    console.log("DEBUG certificate generated");

    // Import the email function
    const { sendFormCompletionEmail } = await import(
      "../email/certificate-email"
    );

    // Send notification to teacher with certificate attached
    console.log("DEBUG sending email to teacher:", teacherEmail);
    await sendFormCompletionEmail(
      teacherEmail,
      teacherName,
      formTitle,
      new Date(),
      studentName,
      certificatePdf
    );
    console.log("DEBUG email sent to teacher");

    // Send certificate to student email if provided
    if (studentEmail) {
      console.log("DEBUG sending email to student:", studentEmail);
      await sendFormCompletionEmail(
        studentEmail,
        studentName,
        formTitle,
        new Date(),
        studentName,
        certificatePdf
      );
      console.log("DEBUG email sent to student");
    }

    // Return success with PDF data for display
    console.log("DEBUG emailCertificate success");
    return {
      message: "Successfully sent notifications",
      certificateUrl: `data:application/pdf;base64,${certificatePdf.toString("base64")}`,
    };
  } catch (error) {
    console.log("DEBUG emailCertificate error:", error);
    return renderError(error);
  }
};
