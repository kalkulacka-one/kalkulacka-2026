import { z } from 'zod';

/**
 * The shape of the legacy archive JSON at archiv.volebnikalkulacka.cz.
 *
 * Validated rather than trusted: this data is ten-plus files of hand-maintained
 * content and the failure mode we care about (a candidate with no answers,
 * a null image, an empty tag list) should surface as a typed absence, not a
 * runtime crash three screens later.
 */

export const archiveQuestionSchema = z.object({
  id: z.string(),
  /** Short label. Becomes `Question.title`. */
  name: z.string(),
  /** The statement. Becomes `Question.statement`. */
  title: z.string(),
  /** Explainer. Becomes `Question.detail`. */
  gist: z.string().nullish(),
  detail: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
});

export const archivePartySchema = z.object({
  id: z.string(),
  name: z.string(),
  short_name: z.string().nullish(),
  abbreviation: z.string().nullish(),
  description: z.string().nullish(),
  img_url: z.string().nullish(),
});

export const archiveCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  short_name: z.string().nullish(),
  type: z.string(),
  description: z.string().nullish(),
  motto: z.string().nullish(),
  img_url: z.string().nullish(),
  is_active: z.boolean().nullish(),
  parties: z.array(archivePartySchema).nullish(),
  contacts: z
    .object({
      web: z.array(z.object({ url: z.string(), label: z.string().nullish() })).nullish(),
      facebook: z.string().nullish(),
      instagram: z.string().nullish(),
      twitter: z.string().nullish(),
    })
    .nullish(),
});

export const archiveAnswerSchema = z.object({
  id: z.string(),
  candidate_id: z.string(),
  question_id: z.string(),
  /** Only these three appear in the archive data. */
  answer: z.enum(['yes', 'no', 'dont_know']),
  comment: z.string().nullish(),
});

export const archiveElectionSchema = z.object({
  id: z.string(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  from: z.string().nullish(),
  to: z.string().nullish(),
});

export const archiveCalculatorSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  district_code: z.string(),
  show_district_code: z.boolean().nullish(),
  election: archiveElectionSchema,
  questions: z.array(archiveQuestionSchema),
  candidates: z.array(archiveCandidateSchema),
  answers: z.array(archiveAnswerSchema),
});

export const archiveIndexSchema = z.object({
  elections: z.array(archiveElectionSchema),
  calculators: z.array(
    z.object({
      election_id: z.string(),
      district_code: z.string(),
      name: z.string(),
      description: z.string().nullish(),
      show_district_code: z.boolean().nullish(),
    }),
  ),
});

export type ArchiveCalculator = z.infer<typeof archiveCalculatorSchema>;
export type ArchiveIndex = z.infer<typeof archiveIndexSchema>;
