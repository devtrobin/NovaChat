import type { Configuration } from 'webpack';

import { rules } from './webpack.rules';
import { plugins } from './webpack.plugins';

rules.push(
  {
    test: /\.(ts|tsx)$/,
    exclude: /node_modules/,
    use: [
      {
        loader: "ts-loader",
        options: {
          transpileOnly: true
        }
      }
    ]
  },
  {
    test: /\.css$/,
    use: ["style-loader", "css-loader"]
  }
);


export const rendererConfig: Configuration = {
  module: {
    rules,
  },
  plugins,
  entry: "./src/renderer.tsx",
  resolve: {
    extensions: [".js", ".ts", ".tsx", ".jsx"]
  }
};
