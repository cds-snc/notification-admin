const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  target: "web",
  // mode: "development", //development
  mode: "production",
  entry: {
    index: ["./app/assets/javascripts/index.js"],
    scheduler: {
      import: './app/assets/javascripts/scheduler/scheduler.js',
      library: {
        name: 'Scheduler',
        type: 'window',
      },
    },
    tiptap: {
      import: './app/assets/javascripts/tiptap/editor.js',
      library: {
        name: 'Tiptap',
        type: 'window',
      },
    },
  },
  watch: false,
  output: {
    filename: "javascripts/[name].min.js",
    path: path.resolve(__dirname, "app/assets")
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react.vendor',
          chunks: 'all',
          priority: 20,
          enforce: true,
        },
      },
    },
  },

  plugins: [
    new webpack.ProgressPlugin(),
    new MiniCssExtractPlugin({
      filename: 'stylesheets/index.css',
      path: path.resolve(__dirname, "app/assets/stylesheets")
    }),
  ],

  module: {
    rules: [
      {
        test: /\.css$/i,
        include: [
          path.resolve(__dirname, "app/assets/javascripts")
        ],
        use: ["style-loader", "css-loader"]
      },
      { test: /\.(png|svg|jpg|gif|ico)$/, use: ["file-loader"] },
      {
        test: /.(js|jsx)$/,
        include: [path.resolve(__dirname, "app/assets/javascripts")],
        loader: "babel-loader",
        options: {
          plugins: ["syntax-dynamic-import"],

          presets: [
            [
              "@babel/preset-env",
              {
                modules: false
              }
            ]
          ]
        }
      },
    ]
  },
};
