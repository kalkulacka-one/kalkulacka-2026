import { type CalculatorSession, db, type Prisma } from '@vk/database';

export type CreateCalculatorSessionParams = Omit<
  Prisma.CalculatorSessionCreateInput,
  'createdAt' | 'updatedAt' | 'deletedAt' | 'sessionId'
> & {
  sessionId?: string;
};

export async function createCalculatorSession(
  params: CreateCalculatorSessionParams,
): Promise<CalculatorSession> {
  const session = await db().calculatorSession.create({
    data: {
      ...params,
      calculatorGroup: params.calculatorGroup ?? null,
      calculatorVersion: params.calculatorVersion ?? null,
      embedName: params.embedName ?? null,
    },
  });

  return session;
}
