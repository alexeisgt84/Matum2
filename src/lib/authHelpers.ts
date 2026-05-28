export const phoneToEmail = (phone: string): string => {
  const cleanPhone = phone.replace(/\D/g, '');
  return `${cleanPhone}@wcatalog.app`;
};

export const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
