import { startOfDay, endOfDay, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isThisMonth = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const filterSalesByDate = (sales: any[], startDate: Date, endDate: Date) => {
  return sales.filter((sale) =>
    isWithinInterval(new Date(sale.dateTime), {
      start: startOfDay(startDate),
      end: endOfDay(endDate),
    })
  );
};

export const getTodaysSales = <T extends { created_at: string }>(sales: T[]): T[] => {
  return sales.filter((sale) => isToday(new Date(sale.created_at)));
};

export const getThisMonthsSales = (sales: any[]) => {
  return sales.filter((sale) => isThisMonth(new Date(sale.dateTime)));
};
