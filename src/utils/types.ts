import { UserLocation, Prisma, Roles } from "@prisma/client";
import { JWTPayload } from "jose";

export type actionReturn = {
  message: string;
  errorMessage?: boolean;
  redirect?: string;
};

export type actionFunction = (
  prevState: any,
  formData: FormData
) => Promise<actionReturn>;

export interface location {
  country?: string;
  state?: string;
  county?: string;
  city: string;
  district?: string;
  name: string;
}

export type UserLocationWithoutId = Omit<UserLocation, "id">;

export interface accessPayload extends JWTPayload {
  name: string;
  userId: string;
  role: Roles;
  isTeacher: boolean;
}

export interface refreshPayload extends JWTPayload {
  userId: string;
}

export type UserLocationWithUser = Prisma.UserLocationGetPayload<{
  include: { user: { select: { name: true; email: true } } };
}>;

export type btnVariant = "default" | "secondary" | "destructive";

export type questionOption = {
  id: string;
  text: string;
  code: number;
};
export type question = {
  id: string;
  question: string;
  showInTeacherExport: boolean;
  options: questionOption[];
  name: string;
  matrixGroup?: string;
};

export type updateQuestionFn = (
  id: string,
  questionText: string,
  showInTeacherExport: boolean,
  name: string,
  matrixGroup?: string
) => void;

export type handleQuestionByIdFn = (questionId: string) => void;
export type updateOptionFn = (
  questionId: string,
  optionId: string,
  text: string,
  code: number
) => void;
export type deleteOptionFn = (questionId: string, optionId: string) => void;
