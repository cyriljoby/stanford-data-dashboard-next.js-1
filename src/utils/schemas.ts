import { z, ZodSchema, ZodTypeDef } from "zod";
import { getRequiredLocationFields } from "./helpers";

export function validateWithZodSchema<T>(
  schema: ZodSchema<T, ZodTypeDef, unknown>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors.map((error) => error.message);
    throw new Error(errors.join(", "));
  }
  return result.data;
}

export const registerSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, {
        message: "Name must be at least 2 characters",
      })
      .max(100, {
        message: "Name must be less than 100 characters",
      }),
    email: z.string().trim().email("Invalid email format"),
    password: z
      .string()
      .min(8, {
        message: "Password must be at least 8 characters",
      })
      .max(20, {
        message: "Password must be less than 20 characters",
      }),
    confirmPassword: z.string(),
    country: z.string().min(1, "Country is a required field"),
    role: z.enum([
      "teacher",
      "site",
      "district",
      "county",
      "state",
      "country",
      "stanford",
      "site-teacher",
      "district-teacher",
      "county-teacher",
      "state-teacher",
    ]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => {
      if (
        data.country !== "UNITED STATES" &&
        !["teacher", "site", "site-teacher", "country"].includes(data.role)
      ) {
        return false;
      }

      return true;
    },
    {
      message: "Only certain roles allowed outside the UNITED STATES",
      path: ["role"],
    }
  );

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, {
      message: "Name must be at least 2 characters",
    })
    .max(100, {
      message: "Name must be less than 100 characters",
    }),
});

export const selectUserLocationSchema = z
  .object({
    role: z.enum(["teacher", "site", "district", "county", "state", "country"]),
    isTeacher: z.enum(["true", "false"]).transform((val) => val === "true"),
    country: z.string().min(1, "Country is a required field"),
    state: z.string().optional(),
    county: z.string().optional(),
    city: z.string().optional(),
    district: z.string().optional(),
    school: z.string().optional(),
    multiplePeriods: z
      .enum(["true", "false"])
      .transform((val) => val === "true"),
  })
  .superRefine((data, ctx) => {
    const {
      canAccessNonUS,
      requireState,
      requireCounty,
      requireDistrict,
      requireCityAndSchool,
    } = getRequiredLocationFields({
      country: data.country,
      role: data.role,
      isTeacher: data.isTeacher,
    });

    if (!canAccessNonUS && data.country !== "UNITED STATES") {
      ctx.addIssue({
        path: ["country"],
        code: z.ZodIssueCode.custom,
        message: "Only UNITED STATES is allowed for your role",
      });
    }

    if (requireState && !data.state) {
      ctx.addIssue({
        path: ["state"],
        code: z.ZodIssueCode.custom,
        message: "State is a required field",
      });
    }

    if (requireCounty && !data.county) {
      ctx.addIssue({
        path: ["county"],
        code: z.ZodIssueCode.custom,
        message: "County is a required field",
      });
    }

    if (requireDistrict && !data.district) {
      ctx.addIssue({
        path: ["district"],
        code: z.ZodIssueCode.custom,
        message: "District is a required field",
      });
    }

    if (requireCityAndSchool && !data.city) {
      ctx.addIssue({
        path: ["city"],
        code: z.ZodIssueCode.custom,
        message: "City is a required field",
      });
    }

    if (requireCityAndSchool && !data.school) {
      ctx.addIssue({
        path: ["school"],
        code: z.ZodIssueCode.custom,
        message: "School is a required field",
      });
    }
  });

export const createLocationSchema = z
  .object({
    role: z.enum(["teacher", "site", "district", "county", "state"]),
    isTeacher: z.enum(["true", "false"]).transform((val) => val === "true"),
    country: z.string().min(1, "Country is a required field"),
    state: z.string().optional(),
    county: z.string().optional(),
    city: z
      .string()
      .trim()
      .min(2, {
        message: "City must be at least 2 characters",
      })
      .max(100, {
        message: "City must be less than 100 characters",
      }),
    district: z.string().optional(),
    school: z
      .string()
      .trim()
      .min(2, {
        message: "School must be at least 2 characters",
      })
      .max(100, {
        message: "School must be less than 100 characters",
      }),
    multiplePeriods: z
      .enum(["true", "false"])
      .transform((val) => val === "true"),
  })
  .superRefine((data, ctx) => {
    if (data.country === "UNITED STATES") {
      if (!data.state) {
        ctx.addIssue({
          path: ["state"],
          code: z.ZodIssueCode.custom,
          message: "State is required for UNITED STATES locations",
        });
      }

      if (!data.county) {
        ctx.addIssue({
          path: ["county"],
          code: z.ZodIssueCode.custom,
          message: "County is required for UNITED STATES locations",
        });
      }

      if (!data.district) {
        ctx.addIssue({
          path: ["district"],
          code: z.ZodIssueCode.custom,
          message: "District is required for UNITED STATES locations",
        });
      }
    }
  });

const OptionSchema = z.object({
  text: z.string().trim().min(1, "Option text cannot be empty"),
  code: z.number(),
});

const QuestionSchema = z.object({
  id: z.string().min(1, "Question id is a required field"),
  name: z.string().trim().min(1, "Question name cannot be empty"),
  question: z.string().trim().min(1, "Question cannot be empty"),
  showInTeacherExport: z.boolean(),
  options: z.array(OptionSchema),
});

export const addFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title cannot be empty"),
    type: z.enum(["pre", "post"]),
    active: z.enum(["true", "false"]).transform((val) => val === "true"),
    provideCertificate: z
      .enum(["true", "false"])
      .transform((val) => val === "true"),
    questions: z.array(QuestionSchema),
  })
  .superRefine((data, ctx) => {
    if (data.type === "pre" && data.provideCertificate) {
      ctx.addIssue({
        path: ["provideCertifcate"],
        code: z.ZodIssueCode.custom,
        message: "You cannot enable certificates for pre-surveys",
      });
    }

    if (data.questions.length === 0) {
      ctx.addIssue({
        path: ["questions"],
        code: z.ZodIssueCode.custom,
        message: "Each form must have at least 1 question",
      });
    }

    const questions: string[] = [];
    data.questions.forEach((question, questionIndex) => {
      if (questions.includes(question.question.toLowerCase())) {
        ctx.addIssue({
          path: ["questions"],
          code: z.ZodIssueCode.custom,
          message: `Question ${questionIndex + 1} is a duplicate question`,
        });
      } else {
        questions.push(question.question.toLowerCase());
      }

      if (question.options.length === 0) {
        ctx.addIssue({
          path: ["questions"],
          code: z.ZodIssueCode.custom,
          message: `Question ${questionIndex + 1} must have at least 1 option`,
        });
      }

      const options: string[] = [];
      const optionCodes: number[] = [];
      question.options.forEach((option) => {
        if (options.includes(option.text.toLowerCase())) {
          ctx.addIssue({
            path: ["questions"],
            code: z.ZodIssueCode.custom,
            message: `Question ${questionIndex + 1} contains a duplicate option`,
          });
        } else {
          options.push(option.text.toLowerCase());
        }

        if (optionCodes.includes(option.code)) {
          ctx.addIssue({
            path: ["questions"],
            code: z.ZodIssueCode.custom,
            message: `Question ${questionIndex + 1} contains a duplicate code`,
          });
        } else {
          optionCodes.push(option.code);
        }
      });
    });
  });

export const updateFormSchema = z.object({
  formId: z.string().min(1, "Form id is a required field"),
  active: z.enum(["true", "false"]).transform((val) => val === "true"),
  provideCertificate: z
    .enum(["true", "false"])
    .transform((val) => val === "true"),
});

export const stanfordSelectUserLocationSchema = z
  .object({
    role: z.enum(["stanford"]),
    locationId: z.string().min(1, "Location id is a required field"),
    country: z.string().min(1, "Country is a required field"),
    state: z.string().optional(),
    city: z.string().min(1, "City is a required field"),
    school: z.string().min(1, "School is a required field"),
  })
  .superRefine((data, ctx) => {
    if (data.country === "UNITED STATES" && !data.state) {
      ctx.addIssue({
        path: ["state"],
        code: z.ZodIssueCode.custom,
        message: "State is required for UNITED STATES locations",
      });
    }
  });

export const AnswerSchema = z.object({
  questionId: z.string().min(1, "Question id is a required field"),
  optionCode: z.number(),
});

export const createResponseWithTeacherSchema = z.object({
  formId: z.string().min(1, "Form id is a required field"),
  teacherId: z.string().min(1, "Teacher id is a required field"),
  details: z.object({
    locationId: z.string().min(1, "Location id is a required field"),
    period: z
      .enum(["0", "1", "2", "3", "4", "5", "6", "7", "8", ""])
      .transform((val) => (val === "" ? null : Number(val))),
    grade: z.enum([
      "k",
      "1",
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "11",
      "12",
      "college or above",
    ]),
  }),
  answers: z.array(AnswerSchema),
});

export const createResponseWithoutTeacherSchema = z
  .object({
    formId: z.string().min(1, "Form id is a required field"),
    location: z.object({
      country: z.string().min(1, "Country is a required field"),
      state: z.string().optional(),
      city: z.string().min(1, "City is a required field"),
      school: z.string().min(1, "School is a required field"),
    }),
    details: z.object({
      grade: z.enum([
        "k",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "10",
        "11",
        "12",
        "college or above",
      ]),
    }),
    answers: z.array(AnswerSchema),
  })
  .superRefine((data, ctx) => {
    if (data.location.country === "UNITED STATES" && !data.location.state) {
      ctx.addIssue({
        path: ["location", "state"],
        code: z.ZodIssueCode.custom,
        message: "State is required for UNITED STATES locations",
      });
    }
  });
