import { Dimensions } from "react-native";

export function createMetrics({
  gap = 6,
  padding = 14,
  screenW = Dimensions.get("window").width,
} = {}) {
  const CELL = (screenW - padding * 2 - gap * 3) / 4; // 4칸 그리드 1칸
  const TOTAL_W = CELL * 4 + gap * 3;                 // 블록 전체 너비
  const H2x2 = CELL * 2 + gap;                        // 2x2 한 변(=높이)

  const widthForCols = (cols: number) => cols * CELL + (cols - 1) * gap;
  const heightForRows = (rows: number) => rows * CELL + (rows - 1) * gap;

  return {
    GAP: gap,
    PADDING: padding,
    CELL,
    TOTAL_W,
    H2x2,
    widthForCols,
    heightForRows,
  };
}
