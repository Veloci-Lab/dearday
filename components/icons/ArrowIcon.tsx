import React from 'react';
import Svg, { Path } from 'react-native-svg';

const ArrowIcon = ({ width = 13.333, height = 20, style }: { width?: number; height?: number; style?: any }) => (
  <Svg
    width={width}
    height={height}
    viewBox="0 0 14 20"
    fill="none"
    style={style}
  >
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M3.68763 2.69141L10.546 9.54141C10.796 9.79141 10.796 10.1997 10.546 10.4497L3.68763 17.3081C3.43763 17.5581 3.0293 17.5581 2.7793 17.3081C2.5293 17.0581 2.5293 16.6497 2.7793 16.3997L9.1793 9.99974L2.7793 3.59974C2.5293 3.34974 2.5293 2.94141 2.7793 2.69141C3.0293 2.44141 3.43763 2.44141 3.68763 2.69141Z"
      fill="#212124"
    />
  </Svg>
);

export default ArrowIcon;
