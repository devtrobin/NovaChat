import type { Configuration } from 'webpack';

import { rules as sharedRules } from './webpack.rules';

export const rendererConfig: Configuration = {
  module: {
    rules: [
      ...sharedRules,
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  entry: './src/renderer.tsx',
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
  },
};
