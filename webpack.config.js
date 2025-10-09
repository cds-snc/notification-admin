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
    remirror: {
      import: "./app/assets/javascripts/remirror/remirror.js",
      library: {
        name: "remirror",
        type: "window",
      }
    }
  },
  watch: false,
  output: {
    filename: "javascripts/[name].min.js",
    path: path.resolve(__dirname, "app/assets")
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
