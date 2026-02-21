import React from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface EditIconProps {
  width?: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
}

const EditIcon: React.FC<EditIconProps> = ({
  width = 24,
  height = 24,
  color = '#0D0D0D',
  backgroundColor = '#F2F2F2',
}) => {
  return (
    <View
      style={{
        backgroundColor,
        borderRadius: 20, 
        padding: 8,        
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Svg width={width} height={height} viewBox="0 0 20 20" fill="none">
        <Path
          d="M10 16.667H17.5"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Path
          d="M13.75 2.91718C14.0815 2.58566 14.5312 2.39941 15 2.39941C15.2321 2.39941 15.462 2.44514 15.6765 2.53398C15.891 2.62282 16.0858 2.75303 16.25 2.91718C16.4142 3.08133 16.5444 3.27621 16.6332 3.49069C16.722 3.70516 16.7678 3.93503 16.7678 4.16718C16.7678 4.39933 16.722 4.6292 16.6332 4.84368C16.5444 5.05815 16.4142 5.25303 16.25 5.41718L5.83333 15.8338L2.5 16.6672L3.33333 13.3338L13.75 2.91718Z"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

export default EditIcon;