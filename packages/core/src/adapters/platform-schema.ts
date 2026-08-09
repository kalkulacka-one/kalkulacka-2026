import { z } from 'zod';

/**
 * The shape of the newer platform data format served by data.kalkulacka.one
 * (the "@kalkulacka-one/schema" format), ported from the schema package in
 * the platform monorepo. Six file types: calculator, questions, candidates,
 * candidates-answers, persons (optional), organizations (optional).
 *
 * Cross-file refinements that would need I/O (e.g. checksum verification)
 * are intentionally not ported — everything here validates a single file in
 * isolation.
 */

export const platformTagSchema = z.string().min(1).max(25);
export const platformTagsSchema = z.array(platformTagSchema).min(1);

/** Loose on purpose — `#rgb` or `#rrggbb`, whatever the source happened to author. */
export const platformColorSchema = z.string().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);

export const platformImageUrlsSchema = z
  .object({
    original: z.string(),
    xs: z.string().optional(),
    sm: z.string().optional(),
    md: z.string().optional(),
    lg: z.string().optional(),
    xl: z.string().optional(),
    '2xl': z.string().optional(),
    '3xl': z.string().optional(),
  })
  .strict();

export const platformImageSchema = z
  .object({
    type: z.enum(['avatar', 'logo', 'portrait', 'opengraph', 'twitter']),
    urls: platformImageUrlsSchema,
    width: z.number().int().min(1).optional(),
    height: z.number().int().min(1).optional(),
    alt: z.string().optional(),
  })
  .strict();

export const platformImagesSchema = z.array(platformImageSchema).min(1);

export type PlatformImageUrls = z.infer<typeof platformImageUrlsSchema>;
export type PlatformImage = z.infer<typeof platformImageSchema>;

export const platformQuestionSchema = z
  .object({
    id: z.uuid(),
    title: z.string(),
    statement: z.string(),
    detail: z.string().optional(),
    tags: platformTagsSchema.optional(),
  })
  .strict();

export const platformQuestionsSchema = z.array(platformQuestionSchema).min(1);

export type PlatformQuestion = z.infer<typeof platformQuestionSchema>;

export const platformPersonIdSchema = z.uuid();
export const platformOrganizationIdSchema = z.uuid();

export const platformPersonReferenceSchema = z
  .object({ id: platformPersonIdSchema, type: z.literal('person') })
  .strict();

export const platformOrganizationReferenceSchema = z
  .object({ id: platformOrganizationIdSchema, type: z.literal('organization') })
  .strict();

const platformPersonBaseSchema = z
  .object({
    id: platformPersonIdSchema,
    additionalName: z.string().optional(),
    honorificPrefix: z.string().optional(),
    honorificSuffix: z.string().optional(),
    sortName: z.string().optional(),
    alternateNames: z.array(z.string()).optional(),
    images: platformImagesSchema.optional(),
    memberOf: z
      .array(z.object({ id: platformOrganizationIdSchema }).strict())
      .min(1)
      .optional(),
    color: platformColorSchema.optional(),
  })
  .strict();

const platformPersonWithFullName = z.object({
  name: z.string(),
  familyName: z.string().optional(),
  givenName: z.string().optional(),
});

const platformPersonWithFamilyAndGivenName = z.object({
  name: z.string().optional(),
  familyName: z.string(),
  givenName: z.string(),
});

export const platformPersonSchema = z.union([
  platformPersonBaseSchema.extend(platformPersonWithFullName.shape),
  platformPersonBaseSchema.extend(platformPersonWithFamilyAndGivenName.shape),
]);

export const platformPersonsSchema = z.array(platformPersonSchema);

export type PlatformPerson = z.infer<typeof platformPersonSchema>;

export const platformOrganizationSchema = z
  .object({
    id: platformOrganizationIdSchema,
    name: z.string(),
    officialName: z.string().optional(),
    shortName: z.string().max(25).optional(),
    abbreviation: z.string().max(15).optional(),
    sortName: z.string().optional(),
    alternateNames: z.array(z.string()).optional(),
    images: platformImagesSchema.optional(),
    members: z
      .array(
        z.discriminatedUnion('type', [
          platformOrganizationReferenceSchema,
          platformPersonReferenceSchema,
        ]),
      )
      .min(1)
      .optional(),
    color: platformColorSchema.optional(),
  })
  .strict()
  .refine((org) => org.shortName || org.abbreviation, {
    message: 'Organization must have either shortName or abbreviation',
  });

export const platformOrganizationsSchema = z.array(platformOrganizationSchema);

export type PlatformOrganization = z.infer<typeof platformOrganizationSchema>;

const platformCandidateBaseSchema = z
  .object({
    id: z.uuid(),
    references: z.array(
      z
        .object({
          id: z.uuid(),
          type: z.enum(['person', 'organization']),
          relationship: z.enum(['coalition-member']).optional(),
        })
        .strict(),
    ),
    displayName: z.string().optional(),
    images: platformImagesSchema.optional(),
    motto: z.string().optional(),
    number: z.number().int().optional(),
  })
  .strict();

export type PlatformCandidate = z.infer<typeof platformCandidateBaseSchema> & {
  nestedCandidates?: PlatformCandidate[];
};

// Candidates can nest (coalitions whose members also carry their own answers),
// hence the z.lazy + explicit type — plain z.infer can't express recursion.
export const platformCandidateSchema: z.ZodType<PlatformCandidate> =
  platformCandidateBaseSchema.extend({
    nestedCandidates: z.array(z.lazy(() => platformCandidateSchema)).optional(),
  });

export const platformCandidatesSchema = z.array(platformCandidateSchema).min(1);

const platformSourceSchema = z
  .object({
    url: z.url(),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

export const platformAnswerSchema = z
  .object({
    questionId: z.uuid(),
    answer: z.union([z.boolean(), z.null()]).optional(),
    isImportant: z.boolean().optional(),
    respondent: z.enum(['user', 'candidate', 'expert']).optional(),
    comment: z.string().optional(),
    sources: z.array(platformSourceSchema).min(1).optional(),
  })
  .strict();

export const platformCandidateAnswerSchema = platformAnswerSchema.extend({
  respondent: z.enum(['candidate', 'expert']).optional(),
});

export const platformCandidatesAnswersSchema = z.record(
  z.uuid(),
  z.array(platformCandidateAnswerSchema),
);

export type PlatformCandidateAnswer = z.infer<typeof platformCandidateAnswerSchema>;
export type PlatformCandidatesAnswers = z.infer<typeof platformCandidatesAnswersSchema>;

const keySchema = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);

const platformDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const platformTimePeriodSchema = z
  .object({
    start: z.union([platformDateSchema, z.iso.datetime()]),
    end: z.union([platformDateSchema, z.iso.datetime()]),
  })
  .strict();

export const platformVariantSchema = z.object({ key: keySchema.trim() }).strict();

export const platformDistrictSchema = z
  .object({ key: keySchema, code: z.string().optional() })
  .strict();

export const platformRoundSchema = z
  .object({
    number: z.number().int().min(0),
    votingHours: z.array(platformTimePeriodSchema).min(1).optional(),
  })
  .strict();

const platformCalculatorGroupReferenceSchema = z.object({ id: z.uuid(), key: keySchema });
const platformElectionReferenceSchema = z.object({ id: z.uuid(), key: keySchema });

export type PlatformVariant = z.infer<typeof platformVariantSchema>;
export type PlatformDistrict = z.infer<typeof platformDistrictSchema>;
export type PlatformRound = z.infer<typeof platformRoundSchema>;

const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);

const platformHashSchema = z.object({ algorithm: z.literal('sha256'), value: z.string() }).strict();
const platformChecksumsSchema = z.object({ questions: platformHashSchema }).strict();
const platformChangeSchema = z
  .object({
    version: semverSchema,
    updatedAt: z.iso.datetime({ offset: true }),
    title: z.string().optional(),
    description: z.string().optional(),
  })
  .strict();

export const platformCalculatorBaseSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }).optional(),
  publishedAt: z.iso.datetime({ offset: true }).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  methodology: z.string().optional(),
  intro: z.string().optional(),
  tags: platformTagsSchema.optional(),
  images: platformImagesSchema.optional(),
  version: semverSchema.optional(),
  checksums: platformChecksumsSchema.optional(),
  changes: z.array(platformChangeSchema).optional(),
});

const platformStandaloneCalculatorSchema = platformCalculatorBaseSchema
  .extend({
    key: keySchema,
    shortTitle: z.string().max(25),
  })
  .strict();

const platformGroupCalculatorSchema = platformCalculatorBaseSchema
  .extend({
    calculatorGroup: platformCalculatorGroupReferenceSchema,
    variant: platformVariantSchema,
    shortTitle: z.string().max(25),
  })
  .strict();

const platformElectionCalculatorSchema = platformCalculatorBaseSchema
  .extend({
    calculatorGroup: platformCalculatorGroupReferenceSchema,
    election: platformElectionReferenceSchema,
    shortTitle: z.string().max(25).optional(),
    variant: platformVariantSchema.optional(),
    district: platformDistrictSchema.optional(),
    round: platformRoundSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!(data.variant || data.district || data.round)) {
      const message = 'Election calculator must have at least a variant, district, or round';
      ctx.addIssue({ code: 'custom', message, path: ['variant'] });
      ctx.addIssue({ code: 'custom', message, path: ['district'] });
      ctx.addIssue({ code: 'custom', message, path: ['round'] });
    }
  });

/**
 * A calculator is one of three shapes: standalone (its own `key`), part of a
 * plain group (`calculatorGroup` + `variant`), or part of an election
 * (`calculatorGroup` + `election`, distinguished by variant/district/round).
 */
export const platformCalculatorSchema = z.union([
  platformStandaloneCalculatorSchema,
  platformGroupCalculatorSchema,
  platformElectionCalculatorSchema,
]);

export type PlatformCalculator = z.infer<typeof platformCalculatorSchema>;
