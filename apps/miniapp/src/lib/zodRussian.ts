import { z } from 'zod';

const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.expected === 'string') return { message: 'Обязательное поле' };
      if (issue.expected === 'number') return { message: 'Укажите число' };
      break;
    case z.ZodIssueCode.too_small:
      if (issue.type === 'string') {
        return { message: `Минимум ${issue.minimum} символов` };
      }
      if (issue.type === 'number') {
        return { message: `Минимальное значение: ${issue.minimum}` };
      }
      break;
    case z.ZodIssueCode.too_big:
      if (issue.type === 'string') {
        return { message: `Максимум ${issue.maximum} символов` };
      }
      if (issue.type === 'number') {
        return { message: `Максимальное значение: ${issue.maximum}` };
      }
      break;
    case z.ZodIssueCode.invalid_string:
      if (issue.validation === 'regex') {
        return { message: 'Неверный формат' };
      }
      break;
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);

export { z };
