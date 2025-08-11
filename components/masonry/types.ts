export type FeedItem = {
  id: string;
  imageUrl: string;
  dateISO: string;
  place: string;
};

export type LayoutType = "L1" | "L2" | "L3";

export type LayoutBlock = {
  key: string;
  type: LayoutType;
  items: FeedItem[]; // 항상 필요 개수로 패딩 (placeholder 포함)
};

export type BuildBlocksOptions = {
  seed?: number;
  initialOrder?: LayoutType[]; // ex) ["L1","L2","L3"]
  noConsecutive?: boolean;     // 연속 동일 타입 금지
  allowed?: LayoutType[];      // 허용 레이아웃 집합
};
