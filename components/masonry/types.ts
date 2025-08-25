export type FeedItem = {
  id: string;
  imageUrl: string;
  dateISO: string;
  place: string;
};

export type LayoutType =
  | "L1"
  | "L2" | "L2-1" | "L2-2" | "L2-3" | "L2-4"
  | "L3" | "L3-1" | "L3-2" | "L3-3" | "L3-4"
  | "L4"
  | "L5";

export type LayoutBlock = {
  key: string;
  type: LayoutType;
  items: FeedItem[]; // placeholder 포함
};

export type BuildBlocksOptions = {
  seed?: number;
  initialOrder?: LayoutType[];
  noConsecutive?: boolean;
  allowed?: LayoutType[];
};
