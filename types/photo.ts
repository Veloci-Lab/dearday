// types/photo.ts

export type PhotoCategory = '추억' | '일상' | '여행' | '공부' | '기타';

export type HomePhoto = {
  id: string;
  categoryId?: string;
  category?: PhotoCategory;
  imageUrl: string;
  memo?: string;
  isRecorded: boolean;
  createdAt: string;
};