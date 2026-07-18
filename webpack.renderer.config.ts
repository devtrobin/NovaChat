import type { Configuration } from 'webpack';

import { rules as sharedRules } from './webpack.rules';
import { plugins } from './webpack.plugins';

export const rendererConfig: Configuration = {
  module: {
    rules: [
      ...sharedRules,
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              transpileOnly: true,
            },
          },
        ],
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  plugins,
  entry: './src/renderer.tsx',
  resolve: {
    extensions: ['.js', '.ts', '.tsx', '.jsx'],
  },
};
