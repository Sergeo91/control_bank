import { z } from 'zod';

// Schémas de validation pour les évaluations
export const evaluationSchema = z.object({
  missionId: z.number().int().positive(),
  villeId: z.number().int().positive(),
  etablissementVisiteId: z.number().int().positive(),
  controleurId: z.number().int().positive(),
  dateEvaluation: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const evaluationRubriqueSchema = z.object({
  voletId: z.number().int().positive(),
  rubriqueId: z.number().int().positive(),
  note: z.number().int().min(1).max(5),
  commentaire: z.string().max(2000).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  nom: z.string().min(1).max(100),
  prenom: z.string().min(1).max(100),
  role: z.enum(['admin', 'superviseur', 'agent']),
});

export type EvaluationInput = z.infer<typeof evaluationSchema>;
export type EvaluationRubriqueInput = z.infer<typeof evaluationRubriqueSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UserInput = z.infer<typeof userSchema>;

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 2000);
}

export function sanitizeNumber(input: unknown): number {
  const num = Number(input);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error('Invalid number');
  }
  return Math.floor(Math.abs(num));
}

