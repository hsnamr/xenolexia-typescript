const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

const appDirectory = path.resolve(__dirname);
const isDev = process.env.NODE_ENV !== 'production';

// Babel loader configuration for React Native Web
const babelLoaderConfiguration = {
  test: /\.(js|jsx|ts|tsx)$/,
  // Include everything except problematic node_modules
  exclude:
    /node_modules\/(?!(react-native-reanimated|react-native-gesture-handler|react-native-screens|react-native-safe-area-context|@react-navigation|react-native-svg|nativewind)\/).*/,
  use: {
    loader: 'babel-loader',
    options: {
      cacheDirectory: true,
      presets: [
        ['@babel/preset-env', {targets: {browsers: ['last 2 versions']}}],
        ['@babel/preset-react', {runtime: 'automatic'}],
        '@babel/preset-typescript',
      ],
      plugins: [
        // Don't use babel-plugin-react-native-web - use webpack alias instead
        '@babel/plugin-transform-runtime',
      ],
    },
  },
};

// Image loader configuration
const imageLoaderConfiguration = {
  test: /\.(gif|jpe?g|png|svg)$/,
  type: 'asset/resource',
};

// Font loader configuration
const fontLoaderConfiguration = {
  test: /\.(woff|woff2|eot|ttf|otf)$/,
  type: 'asset/resource',
};

module.exports = {
  entry: path.resolve(appDirectory, 'index.web.js'),
  output: {
    path: path.resolve(appDirectory, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: '/',
    clean: true,
  },
  module: {
    rules: [babelLoaderConfiguration, imageLoaderConfiguration, fontLoaderConfiguration],
  },
  resolve: {
    extensions: ['.web.tsx', '.web.ts', '.web.js', '.tsx', '.ts', '.js'],
    alias: {
      // Map react-native to react-native-web
      'react-native$': path.resolve(appDirectory, 'node_modules/react-native-web'),
      // Web mocks for native modules
      'react-native-fs': path.resolve(appDirectory, 'src/mocks/react-native-fs.web.ts'),
      'react-native-document-picker': path.resolve(
        appDirectory,
        'src/mocks/react-native-document-picker.web.ts'
      ),
      'react-native-sqlite-storage': path.resolve(
        appDirectory,
        'src/mocks/react-native-sqlite-storage.web.ts'
      ),
      'react-native-webview': path.resolve(appDirectory, 'src/mocks/react-native-webview.web.tsx'),
      // Path aliases matching tsconfig
      '@': path.resolve(appDirectory, 'src'),
      '@app': path.resolve(appDirectory, 'src/app'),
      '@components': path.resolve(appDirectory, 'src/components'),
      '@screens': path.resolve(appDirectory, 'src/screens'),
      '@services': path.resolve(appDirectory, 'src/services'),
      '@stores': path.resolve(appDirectory, 'src/stores'),
      '@hooks': path.resolve(appDirectory, 'src/hooks'),
      '@utils': path.resolve(appDirectory, 'src/utils'),
      '@types': path.resolve(appDirectory, 'src/types'),
      '@constants': path.resolve(appDirectory, 'src/constants'),
      '@assets': path.resolve(appDirectory, 'src/assets'),
      '@navigation': path.resolve(appDirectory, 'src/navigation'),
      '@theme': path.resolve(appDirectory, 'src/theme'),
    },
    fallback: {
      // Node.js polyfills for web
      crypto: false,
      stream: false,
      buffer: false,
      fs: false,
      path: false,
    },
  },
  plugins: [
    // Define React Native globals for web
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(isDev),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(appDirectory, 'public/index.html'),
      filename: 'index.html',
    }),
  ],
  devServer: {
    static: {
      directory: path.join(appDirectory, 'public'),
    },
    historyApiFallback: true,
    compress: true,
    port: 3000,
    hot: true,
    open: true,
  },
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  devtool: process.env.NODE_ENV === 'production' ? 'source-map' : 'eval-source-map',
};
