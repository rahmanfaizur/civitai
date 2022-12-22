import { GetByIdInput } from '~/server/schema/base.schema';
import { Prisma } from '@prisma/client';
import { prisma } from '~/server/db/client';
import {
  GetQuestionsInput,
  SetQuestionAnswerInput,
  UpsertQuestionInput,
} from '~/server/schema/question.schema';
import { getPagination, getPagingData } from '~/server/utils/pagination-helpers';
import { isTag } from '~/server/schema/tag.schema';

export const getQuestions = async <TSelect extends Prisma.QuestionSelect>({
  limit,
  page,
  query,
  tagname,
  select,
}: GetQuestionsInput & { select: TSelect }) => {
  const { take, skip } = getPagination(limit, page);
  const where: Prisma.QuestionWhereInput = {
    title: query ? { contains: query, mode: 'insensitive' } : undefined,
    tags: tagname
      ? { some: { tag: { name: { equals: tagname, mode: 'insensitive' } } } }
      : undefined,
  };
  const items = await prisma.question.findMany({
    take,
    skip,
    select,
    where,
  });
  const count = await prisma.question.count({ where });
  return getPagingData({ items, count }, take, page);
};

export const getQuestionDetail = async <TSelect extends Prisma.QuestionSelect>({
  id,
  select,
}: {
  id: number;
  select: TSelect;
}) => {
  return await prisma.question.findUnique({ where: { id }, select });
};

// export const toggleQuestionReaction = async ({questionId, }) => {
//   return await toggleReaction({entityType: 'question', entityId: questionId,})
// };

export const upsertQuestion = async ({
  id,
  title,
  content,
  tags,
  userId,
}: UpsertQuestionInput & { userId: number }) => {
  return !id
    ? await prisma.question.create({
        data: {
          title,
          content,
          userId,
          tags: tags
            ? {
                create: tags.map(({ name }) => ({
                  tag: {
                    connectOrCreate: {
                      where: { name },
                      create: { name },
                    },
                  },
                })),
              }
            : undefined,
        },
      })
    : await prisma.question.update({
        where: { id },
        data: {
          title,
          content,
          tags: tags
            ? {
                deleteMany: {
                  tagId: {
                    notIn: tags.filter(isTag).map((x) => x.id),
                  },
                },
                create: tags
                  .filter((x) => !x.id)
                  .map(({ name }) => ({
                    tag: {
                      connectOrCreate: {
                        where: { name },
                        create: { name },
                      },
                    },
                  })),
              }
            : undefined,
        },
      });
};

export const deleteQuestion = async ({ id }: GetByIdInput) => {
  await prisma.question.delete({ where: { id } });
};

export const setQuestionAnswer = async ({ id, answerId }: SetQuestionAnswerInput) => {
  await prisma.question.update({ where: { id }, data: { selectedAnswerId: answerId } });
};
